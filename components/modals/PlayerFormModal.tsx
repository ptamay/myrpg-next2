"use client";

import React, { useState, useRef, useEffect } from "react";
import Modal from "../ui/Modal";
import CropModal from "./CropModal";
import { useApp } from "@/contexts/AppContext";
import { useSystemDialog } from "@/contexts/SystemDialogContext";
import { useUserSession } from "@/contexts/UserSessionContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { mapPlayerToDB } from "@/lib/supabase/mappers";
import { SAVES_LIST, SKILLS_LIST } from "@/lib/constants/dnd5e";
import { DND5E_CLASSES, getProficiencyBonus, isCaster, getCasterType, getSpellSlotsForLevel, getDefaultClassResources, getDefaultAbilities, getSpellcastingAbility } from "@/lib/constants/dnd5eClasses";
import SpellsSection from "../ui/SpellsSection";
import ClassResourcesSection from "../ui/ClassResourcesSection";
import AbilitiesSection from "../ui/AbilitiesSection";
import DamageTypeSelector from "../ui/DamageTypeSelector";
import LevelUpModal from "./LevelUpModal";
import { SpellEntry, ClassResource, Ability } from "@/lib/gameData";
import { uploadBase64Image } from "@/lib/supabase/storage";

interface PlayerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const initialFormState = {
  name: "",
  playerClass: "",
  subclass: "",
  playerLevel: "1",
  race: "",
  str: "10",
  dex: "10",
  con: "10",
  int: "10",
  wis: "10",
  cha: "10",
  hpMax: "",
  ac: "",
  init: "",
  speed: "9m",
  perc: "10",
  hdTotal: "1",
  inspiration: false,
  minSleepReq: "8",
  profBonus: "2",
  customClass: "",
  hasSpells: false,
  spellcastingAbility: "int" as 'str'|'dex'|'con'|'int'|'wis'|'cha'|'none',
  spellSlotType: "standard" as "standard"|"pact"|"none",
  spellSlots: {} as Record<number, number>,
  spellsKnown: [] as SpellEntry[],
  classResources: [] as ClassResource[],
  abilities: [] as Ability[],
  resistances: [] as string[],
  immunities: [] as string[]
};

const dataToFormState = (data: any) => ({
  name: data?.name || "",
  playerClass: data?.playerClass || data?.classLevel || "",
  subclass: data?.subclass || "",
  playerLevel: data?.playerLevel?.toString() || "1",
  race: data?.race || "",
  str: data?.str?.toString() || "10",
  dex: data?.dex?.toString() || "10",
  con: data?.con?.toString() || "10",
  int: data?.int?.toString() || "10",
  wis: data?.wis?.toString() || "10",
  cha: data?.cha?.toString() || "10",
  hpMax: data?.hpMax?.toString() || "",
  ac: data?.ac?.toString() || "",
  init: data?.init || "",
  speed: data?.speed || "",
  perc: data?.perc?.toString() || "",
  hdTotal: data?.hdTotal || "",
  inspiration: data?.inspiration || false,
  minSleepReq: data?.minSleepReq?.toString() || "8",
  profBonus: data?.profBonus?.toString().replace('+', '') || "2",
  customClass: data?.customClass || "",
  hasSpells: data?.hasSpells || false,
  spellcastingAbility: data?.spellcastingAbility || "int",
  spellSlotType: data?.spellSlotType || "standard",
  spellSlots: data?.spellSlots || {},
  spellsKnown: data?.spellsKnown || [],
  classResources: data?.classResources || [],
  abilities: data?.abilities || [],
  resistances: data?.resistances || [],
  immunities: data?.immunities || []
});

const dataToAttacks = (data: any) => {
  if (data?.attacks && data.attacks.length > 0) {
    const currentAttacks = [...data.attacks];
    while (currentAttacks.length < 3) currentAttacks.push({ name: "", bonus: "", dmg: "" });
    return currentAttacks;
  }
  return [
    { name: "", bonus: "", dmg: "" },
    { name: "", bonus: "", dmg: "" },
    { name: "", bonus: "", dmg: "" }
  ];
};

const dataToSaves = (data: any) => Array.isArray(data?.saves) ? data.saves : (typeof data?.saves === 'string' && data.saves ? data.saves.split(',').map((s:string) => s.trim()) : []);
const dataToSkills = (data: any) => Array.isArray(data?.skills) ? data.skills : (typeof data?.skills === 'string' && data.skills ? data.skills.split(',').map((s:string) => s.trim()) : []);
const dataToExpertise = (data: any) => Array.isArray(data?.expertiseSkills) ? data.expertiseSkills : [];
const getModifier = (stat: number) => Math.floor((stat - 10) / 2);

export default function PlayerFormModal({ isOpen, onClose }: PlayerFormModalProps) {
  const { dadosGlobais, setDadosGlobais, salvarEstadoLocal, activeData } = useApp();
  const { showAlert } = useSystemDialog();
  const { isGM, session } = useUserSession();

  // Bloqueia renderização se não for GM e não for dono
  if (isOpen && activeData && !isGM && activeData.id !== session?.playerId) {
    return null;
  }

  // General States
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);

  // Original Form States
  const [formState, setFormState] = useState(initialFormState);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [attacksState, setAttacksState] = useState<any[]>([]);
  const [selectedSaves, setSelectedSaves] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [expertiseSkills, setExpertiseSkills] = useState<string[]>([]);

  // Transformation States
  const [hasTransformation, setHasTransformation] = useState(false);
  const [isEditingTransformation, setIsEditingTransformation] = useState(false);
  const [transFormState, setTransFormState] = useState(initialFormState);
  const [transAvatarBase64, setTransAvatarBase64] = useState<string | null>(null);
  const [transAttacksState, setTransAttacksState] = useState<any[]>([]);
  const [transSelectedSaves, setTransSelectedSaves] = useState<string[]>([]);
  const [transSelectedSkills, setTransSelectedSkills] = useState<string[]>([]);
  const [transExpertiseSkills, setTransExpertiseSkills] = useState<string[]>([]);

  // Crop Modal & Level Up Modal
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isLevelUpModalOpen, setIsLevelUpModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const prevIsOpenRef = useRef(false);
  const loadedPlayerIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const justOpened = !prevIsOpenRef.current;
      const isNewData = activeData?.id !== loadedPlayerIdRef.current;
      
      if (activeData) {
        if (justOpened || isNewData) {
          setFormState(dataToFormState(activeData));
          setAvatarBase64(activeData.image || null);
          setAttacksState(dataToAttacks(activeData));
          setSelectedSaves(dataToSaves(activeData));
          setSelectedSkills(dataToSkills(activeData));
          setExpertiseSkills(dataToExpertise(activeData));

          if (activeData.transformation) {
            setHasTransformation(true);
            setTransFormState(dataToFormState(activeData.transformation));
            setTransAvatarBase64(activeData.transformation.image || null);
            setTransAttacksState(dataToAttacks(activeData.transformation));
            setTransSelectedSaves(dataToSaves(activeData.transformation));
            setTransSelectedSkills(dataToSkills(activeData.transformation));
            setTransExpertiseSkills(dataToExpertise(activeData.transformation));
          } else {
            setHasTransformation(false);
            setTransFormState(dataToFormState({ name: activeData.name + " (Transformado)" }));
            setTransAvatarBase64(null);
            setTransAttacksState(dataToAttacks({}));
            setTransSelectedSaves([]);
            setTransSelectedSkills([]);
            setTransExpertiseSkills([]);
          }
        }
      } else {
        if (justOpened || isNewData) {
          setFormState(initialFormState);
          setAvatarBase64(null);
          setAttacksState(dataToAttacks({}));
          setSelectedSaves([]);
          setSelectedSkills([]);
          setExpertiseSkills([]);

          setHasTransformation(false);
          setTransFormState(initialFormState);
          setTransAvatarBase64(null);
          setTransAttacksState(dataToAttacks({}));
          setTransSelectedSaves([]);
          setTransSelectedSkills([]);
          setTransExpertiseSkills([]);
        }
      }
      
      if (justOpened || isNewData) setIsEditingTransformation(activeData?.isTransformed || false);

      const fetchProfiles = async () => {
        const supabase = getSupabaseClient();
        const { data } = await supabase.from('profiles').select('id, display_name, email, player_id');
        if (data) {
          setProfiles(data);
          if (activeData?.id) {
            const linkedProfile = data.find((p: any) => p.player_id === activeData.id);
            if (linkedProfile) setSelectedUserId(linkedProfile.id);
            else setSelectedUserId("");
          } else {
            setSelectedUserId("");
          }
        }
      };
      if ((justOpened || isNewData) && isGM) fetchProfiles();
      
      loadedPlayerIdRef.current = activeData?.id || null;
      prevIsOpenRef.current = true;
    } else {
      prevIsOpenRef.current = false;
      loadedPlayerIdRef.current = null;
    }
  }, [isOpen, activeData, isGM]);

  const activeState = isEditingTransformation ? transFormState : formState;
  const activeAvatar = isEditingTransformation ? transAvatarBase64 : avatarBase64;
  const activeAttacks = isEditingTransformation ? transAttacksState : attacksState;
  const activeSaves = isEditingTransformation ? transSelectedSaves : selectedSaves;
  const activeSkills = isEditingTransformation ? transSelectedSkills : selectedSkills;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    let updates: any = { [name]: finalValue };
    
    if (name === 'playerClass' && value !== 'custom' && value !== '') {
      const cls = DND5E_CLASSES.find(c => c.id === value);
      if (cls) {
        const level = isEditingTransformation ? transFormState.playerLevel : formState.playerLevel;
        const currentSubclass = ""; // Reset subclass on class change
        updates.subclass = "";
        
        updates.hdTotal = `${level}d${cls.hitDie}`;
        updates.profBonus = getProficiencyBonus(parseInt(level)).toString();
        
        // Reset spells and class specific data when changing class
        updates.classResources = getDefaultClassResources(value, parseInt(level) || 1, currentSubclass);
        updates.abilities = getDefaultAbilities(value, parseInt(level) || 1, currentSubclass);
        
        if (value === 'monge') {
          const atk = { name: 'Ataque Desarmado', bonus: '', dmg: '' };
          if (isEditingTransformation) setTransAttacksState([atk]);
          else setAttacksState([atk]);
        } else {
          if (isEditingTransformation) {
            setTransAttacksState([]);
          } else {
            setAttacksState([]);
          }
        }
        
        updates.spellsKnown = [];
        updates.spellSlotsUsed = {};
        
        if (isCaster(value, currentSubclass)) {
          updates.hasSpells = true;
          updates.spellcastingAbility = getSpellcastingAbility(value, currentSubclass);
          updates.spellSlotType = getCasterType(value, currentSubclass) === 'pact' ? 'pact' : 'standard';
          updates.spellSlots = getSpellSlotsForLevel(value, parseInt(level) || 1, currentSubclass);
        } else {
          updates.hasSpells = false;
          updates.spellSlots = {};
        }
      }
    }

    if (name === 'playerLevel') {
      const cls = DND5E_CLASSES.find(c => c.id === (isEditingTransformation ? transFormState.playerClass : formState.playerClass));
      if (cls) {
        const oldLevel = parseInt(isEditingTransformation ? transFormState.playerLevel : formState.playerLevel) || 1;
        const newLevel = parseInt(value) || 1;
        const levelDiff = newLevel - oldLevel;
        
        updates.hdTotal = `${newLevel}d${cls.hitDie}`;
        updates.profBonus = getProficiencyBonus(newLevel).toString();
        
        if (levelDiff !== 0) {
          const conMod = getModifier(parseInt(isEditingTransformation ? transFormState.con : formState.con));
          const avgDie = Math.floor(cls.hitDie / 2) + 1;
          const currentHpMax = parseInt(isEditingTransformation ? transFormState.hpMax : formState.hpMax) || 0;
          
          // Se diminuiu de level, levelDiff será negativo e subtrairá HP. Se subiu, soma HP.
          const hpDiff = levelDiff * (avgDie + conMod);
          const finalHpMax = Math.max(1, currentHpMax + hpDiff);
          
          updates.hpMax = finalHpMax.toString();
          updates.hpCurrent = updates.hpMax; // Atualiza o current pra bater com o max novo
        }
      }
    }

    if (name === 'subclass' && value !== '') {
      const clsId = isEditingTransformation ? transFormState.playerClass : formState.playerClass;
      const level = isEditingTransformation ? transFormState.playerLevel : formState.playerLevel;
      const currentAbilities = isEditingTransformation ? transFormState.abilities : formState.abilities;
      
      // We replace the abilities entirely to prevent stale abilities from a previous subclass
      updates.abilities = getDefaultAbilities(clsId, parseInt(level) || 1, value);

      // Same for class resources
      updates.classResources = getDefaultClassResources(clsId, parseInt(level) || 1, value);

      if (isCaster(clsId, value)) {
        updates.hasSpells = true;
        updates.spellcastingAbility = getSpellcastingAbility(clsId, value);
        updates.spellSlotType = getCasterType(clsId, value) === 'pact' ? 'pact' : 'standard';
        updates.spellSlots = getSpellSlotsForLevel(clsId, parseInt(level) || 1, value);
      } else {
        updates.hasSpells = false;
        updates.spellSlots = {};
        updates.spellsKnown = [];
        updates.spellSlotsUsed = {};
      }
    }

    if (isEditingTransformation) {
      setTransFormState(prev => ({ ...prev, ...updates }));
    } else {
      setFormState(prev => ({ ...prev, ...updates }));
    }
  };

  const handleAttackChange = (index: number, field: string, value: string) => {
    if (isEditingTransformation) {
      const newAttacks = [...transAttacksState];
      newAttacks[index][field] = value;
      setTransAttacksState(newAttacks);
    } else {
      const newAttacks = [...attacksState];
      newAttacks[index][field] = value;
      setAttacksState(newAttacks);
    }
  };

  const addAttack = () => {
    if (isEditingTransformation) {
      setTransAttacksState([...transAttacksState, { name: "", bonus: "", dmg: "" }]);
    } else {
      setAttacksState([...attacksState, { name: "", bonus: "", dmg: "" }]);
    }
  };

  const handleSavesChange = (save: string, checked: boolean) => {
    if (isEditingTransformation) {
      if (checked) setTransSelectedSaves([...transSelectedSaves, save]);
      else setTransSelectedSaves(transSelectedSaves.filter(s => s !== save));
    } else {
      if (checked) setSelectedSaves([...selectedSaves, save]);
      else setSelectedSaves(selectedSaves.filter(s => s !== save));
    }
  };

  const handleSkillsChange = (skill: string, checked: boolean) => {
    if (isEditingTransformation) {
      if (checked) setTransSelectedSkills([...transSelectedSkills, skill]);
      else {
        setTransSelectedSkills(transSelectedSkills.filter(s => s !== skill));
        setTransExpertiseSkills(transExpertiseSkills.filter(s => s !== skill)); // Remove expertise se perder proficiência
      }
    } else {
      if (checked) setSelectedSkills([...selectedSkills, skill]);
      else {
        setSelectedSkills(selectedSkills.filter(s => s !== skill));
        setExpertiseSkills(expertiseSkills.filter(s => s !== skill)); // Remove expertise se perder proficiência
      }
    }
  };

  const handleExpertiseChange = (skill: string, checked: boolean) => {
    if (isEditingTransformation) {
      if (checked) setTransExpertiseSkills([...transExpertiseSkills, skill]);
      else setTransExpertiseSkills(transExpertiseSkills.filter(s => s !== skill));
    } else {
      if (checked) setExpertiseSkills([...expertiseSkills, skill]);
      else setExpertiseSkills(expertiseSkills.filter(s => s !== skill));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCropImageSrc(ev.target?.result as string);
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (base64: string) => {
    if (isEditingTransformation) setTransAvatarBase64(base64);
    else setAvatarBase64(base64);
  };

  const handleImportImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files).slice(0, 4);
    setIsImporting(true);

    try {
      const base64Images = await Promise.all(filesArray.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const img = new window.Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              if (!ctx) return resolve(ev.target?.result as string);
              const maxW = 800, maxH = 800;
              let width = img.width, height = img.height;
              if (width > height) { if (width > maxW) { height = Math.round(height * maxW / width); width = maxW; } } 
              else { if (height > maxH) { width = Math.round(width * maxH / height); height = maxH; } }
              canvas.width = width; canvas.height = height;
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL("image/jpeg", 0.6));
            };
            img.onerror = () => resolve(ev.target?.result as string);
            img.src = ev.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }));

      const res = await fetch("/api/import-player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: base64Images })
      });

      if (!res.ok) {
        let errText = await res.text();
        let errMsg = errText;
        try {
          const errJson = JSON.parse(errText);
          if (errJson.error) errMsg = errJson.error;
        } catch(e) {
          if (errText.includes("Request Entity Too Large") || errText.includes("Body exceeded")) {
            errMsg = "As imagens selecionadas são muito grandes. Tente com imagens menores.";
          } else {
            errMsg = errText.substring(0, 100);
          }
        }
        throw new Error(errMsg);
      }
      const data = await res.json();
      
      const newState = dataToFormState(data);
      if (isEditingTransformation) {
        setTransFormState(prev => ({...prev, ...newState}));
        if (data.saves && Array.isArray(data.saves)) setTransSelectedSaves(data.saves);
        if (data.skills && Array.isArray(data.skills)) setTransSelectedSkills(data.skills);
        if (data.expertiseSkills && Array.isArray(data.expertiseSkills)) setTransExpertiseSkills(data.expertiseSkills);
        if (data.attacks && Array.isArray(data.attacks)) setTransAttacksState(dataToAttacks(data));
        if (data.classResources && Array.isArray(data.classResources)) setTransFormState(prev => ({...prev, classResources: data.classResources}));
      } else {
        setFormState(prev => ({...prev, ...newState}));
        if (data.saves && Array.isArray(data.saves)) setSelectedSaves(data.saves);
        if (data.skills && Array.isArray(data.skills)) setSelectedSkills(data.skills);
        if (data.expertiseSkills && Array.isArray(data.expertiseSkills)) setExpertiseSkills(data.expertiseSkills);
        if (data.attacks && Array.isArray(data.attacks)) setAttacksState(dataToAttacks(data));
        if (data.classResources && Array.isArray(data.classResources)) setFormState(prev => ({...prev, classResources: data.classResources}));
      }
      
      await showAlert({ title: "Importação Concluída", message: "Ficha importada com sucesso!", type: "success" });
    } catch (error: any) {
      await showAlert({ title: "Erro na Importação", message: "Falha ao importar: " + error.message, type: "danger" });
    } finally {
      setIsImporting(false);
      if (importFileInputRef.current) importFileInputRef.current.value = "";
    }
  };

  const constructPlayerObject = (state: typeof initialFormState, attacksList: any[], savesList: string[], skillsList: string[], expertiseList: string[], imgBase: string | null, prevData: any) => {
    const hpMax = parseInt(state.hpMax) || 0;
    const cleanAttacks = attacksList.filter(a => a.name || a.bonus || a.dmg);
    
    // Calcula features baseado na classe selecionada
    const classData = DND5E_CLASSES.find(c => c.id === state.playerClass);
    const classFeatures = classData?.features || [];

    return {
      name: state.name || "",
      playerClass: state.playerClass || "",
      subclass: state.subclass || "",
      customClass: state.playerClass === "custom" ? (state.customClass || "") : undefined,
      classLevel: state.playerClass || "",
      playerLevel: parseInt(state.playerLevel) || 1,
      race: state.race || "",
      str: state.str,
      dex: state.dex,
      con: state.con,
      int: state.int,
      wis: state.wis,
      cha: state.cha,
      hpMax,
      hpCurrent: prevData?.hpCurrent !== undefined ? prevData.hpCurrent : hpMax,
      image: imgBase || undefined,
      ac: state.ac,
      init: state.init || "",
      speed: state.speed || "",
      perc: state.perc,
      hdTotal: state.hdTotal || "",
      inspiration: state.inspiration,
      attacks: cleanAttacks,
      isDead: prevData?.isDead || false,
      saves: savesList,
      skills: skillsList,
      expertiseSkills: expertiseList,
      classFeatures,
      profBonus: state.profBonus,
      minSleepReq: parseInt(state.minSleepReq) || 8,
      inventory: prevData?.inventory || [],
      notes: prevData?.notes || "",
      background: prevData?.background || "",
      personalGoals: prevData?.personalGoals || "",
      hasSpells: state.hasSpells,
      spellcastingAbility: state.spellcastingAbility,
      spellSlotType: state.spellSlotType,
      spellSlots: state.spellSlots,
      spellSlotsUsed: prevData?.spellSlotsUsed || {},
      spellsKnown: state.spellsKnown,
      classResources: state.classResources,
      abilities: state.abilities,
      resistances: state.resistances,
      immunities: state.immunities
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const isValidUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const id = (activeData?.id && isValidUUID(activeData.id)) ? activeData.id : crypto.randomUUID();

    const supabase = getSupabaseClient();
    
    // Faz o upload das imagens Base64 (se houver) para o Supabase Storage e retorna a URL
    let finalAvatarUrl = avatarBase64;
    let finalTransAvatarUrl = transAvatarBase64;
    try {
      if (finalAvatarUrl && finalAvatarUrl.startsWith("data:image/")) {
        finalAvatarUrl = await uploadBase64Image(finalAvatarUrl, "avatars") || finalAvatarUrl;
      }
      if (hasTransformation && finalTransAvatarUrl && finalTransAvatarUrl.startsWith("data:image/")) {
        finalTransAvatarUrl = await uploadBase64Image(finalTransAvatarUrl, "avatars") || finalTransAvatarUrl;
      }
    } catch (uploadError: any) {
      await showAlert({ title: "Erro", message: "Erro ao fazer upload da imagem: " + (uploadError.message || "Tente novamente."), type: "danger" });
      return;
    }

    const selectedProfile = profiles.find(p => p.id === selectedUserId);
    const resolvedPlayerName = selectedProfile ? (selectedProfile.display_name || selectedProfile.email) : "";

    const playerData: any = {
      id,
      playerName: resolvedPlayerName,
      ...constructPlayerObject(formState, attacksState, selectedSaves, selectedSkills, expertiseSkills, finalAvatarUrl, activeData),
      transformation: undefined,
      isTransformed: hasTransformation ? isEditingTransformation : false
    };

    if (hasTransformation) {
      playerData.transformation = constructPlayerObject(transFormState, transAttacksState, transSelectedSaves, transSelectedSkills, transExpertiseSkills, finalTransAvatarUrl, activeData?.transformation);
    }

    const newPlayers = [...(dadosGlobais.players || [])];
    if (activeData?.id) {
      const idx = newPlayers.findIndex(p => p.id === activeData.id);
      if (idx !== -1) {
        newPlayers[idx] = { ...newPlayers[idx], ...playerData };
      } else {
        newPlayers.push(playerData);
      }
    } else {
      newPlayers.push(playerData);
    }

    try {
      // 1. Force player upsert/update first to satisfy any foreign key constraints
      const { data: campData } = await supabase.from('campaign').select('id').limit(1).maybeSingle();
      
      const mappedPlayer = mapPlayerToDB(playerData, campData?.id || null);
      
      // Fallback de segurança para garantir que a classe não seja enviada como nula
      if (!mappedPlayer.class && mappedPlayer.class !== "") {
        (mappedPlayer as any).class = mappedPlayer.player_class || "Desconhecida";
      }

      if (isGM) {
        const { error: upsertError } = await supabase.from("players").upsert([mappedPlayer]);
        if (upsertError) {
          console.error("Erro ao fazer upsert do player:", upsertError);
          await showAlert({ title: "Erro", message: "Erro ao salvar (RLS ou BD): " + (upsertError.message || JSON.stringify(upsertError)), type: "danger" });
          return;
        }
      } else {
        const { error: updateError } = await supabase.from("players").update(mappedPlayer).eq("id", mappedPlayer.id);
        if (updateError) {
          console.error("Erro ao atualizar player:", updateError);
          await showAlert({ title: "Erro", message: "Erro ao atualizar sua ficha (RLS): " + (updateError.message || JSON.stringify(updateError)), type: "danger" });
          return;
        }
      }

      // 2. Update profiles table
      if (selectedUserId) {
        await supabase.from('profiles').update({ player_id: null }).eq('player_id', id);
        const { error } = await supabase.from('profiles').update({ player_id: id }).eq('id', selectedUserId);
        if (error) {
          console.error("Erro ao vincular perfil no Supabase:", error);
        }
      } else {
        await supabase.from('profiles').update({ player_id: null }).eq('player_id', id);
      }
    } catch (e) {
      console.error("Erro ao executar update de profiles/players:", e);
    }

    // 3. Update global context
    setDadosGlobais({ ...dadosGlobais, players: newPlayers });
    window.dispatchEvent(new CustomEvent('sync_entity_to_combat', { detail: { entity: playerData, type: 'player' } }));
    
    // Passamos a entidade mapeada direto no evento para economizar Egress e não bater no BD
    window.dispatchEvent(new CustomEvent('force_players_refresh', { detail: { player: playerData } }));
    
    salvarEstadoLocal();
    onClose(); // Close form first!
    showAlert({ title: "Ficha Salva", message: "A ficha foi salva com sucesso no banco de dados!", type: "success" });
    } catch (criticalError: any) {
      console.error("Critical error in handleSubmit:", criticalError);
      await showAlert({ title: "Erro Crítico", message: "Um erro inesperado aconteceu ao salvar: " + (criticalError.message || JSON.stringify(criticalError)), type: "danger" });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="player-form-modal">
      <div className="modal-content modal-xl glass-panel">
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="modal-subtitle">Banco de Dados</span>
            <h2 className="modal-title" id="player-form-title">{isEditingTransformation ? "Ficha da Transformação" : "Novo Jogador"}</h2>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', marginRight: '10px' }}>
              <button type="button" 
                style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', background: !hasTransformation ? 'rgba(255,255,255,0.1)' : 'transparent', color: !hasTransformation ? '#fff' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => { setHasTransformation(false); setIsEditingTransformation(false); }}
              >Ficha Única</button>
              <button type="button" 
                style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', background: hasTransformation ? 'var(--accent-primary)' : 'transparent', color: hasTransformation ? '#fff' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => setHasTransformation(true)}
              >Forma Dupla (Transformação)</button>
            </div>
            
            <input type="file" id="input-player-pdf" accept="image/*,application/pdf" multiple className="hidden" ref={importFileInputRef} onChange={handleImportImages} style={{ display: "none" }} />
            <button type="button" onClick={() => importFileInputRef.current?.click()} className="btn secondary-btn small-btn" disabled={isImporting}>
              {isImporting ? (
                <span>Carregando...</span>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  <span>Importar Ficha (Img/PDF)</span>
                </>
              )}
            </button>
            <button id="btn-close-player-form" className="close-btn" onClick={onClose}>
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </header>

        {hasTransformation && (
          <div className="tabs-nav" style={{ padding: "0 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: "15px", marginBottom: "15px" }}>
            <button 
              type="button"
              className={`det-tab-btn ${!isEditingTransformation ? 'active' : ''}`}
              onClick={() => setIsEditingTransformation(false)}
            >Forma Original</button>
            <button 
              type="button"
              className={`det-tab-btn ${isEditingTransformation ? 'active' : ''}`}
              onClick={() => setIsEditingTransformation(true)}
              style={{ color: "var(--accent-primary)" }}
            >Forma Transformada</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-body custom-scrollbar" style={{ paddingTop: hasTransformation ? "0" : "15px" }}>
          <div className="form-grid-layout">
            <div className="form-col-avatar">
              <div className="avatar-upload" id="player-avatar-upload-area" onClick={() => fileInputRef.current?.click()} style={{ cursor: "pointer", border: isEditingTransformation ? "2px dashed var(--accent-primary)" : undefined }}>
                {activeAvatar ? (
                  <img src={activeAvatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "12px" }} />
                ) : (
                  <div className="avatar-placeholder" id="form-player-avatar-placeholder">
                    <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <span>Upload Portrait</span>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" style={{ display: "none" }} accept="image/*" onChange={handleFileChange} />
            </div>
            <div className="form-col-main">
              <div className="form-row">
                <div className="form-group flex-2">
                  <label>Nome do Personagem *</label>
                  <input type="text" name="name" className="journey-input" value={activeState.name} onChange={handleChange} />
                </div>
                {!isEditingTransformation && (
                  <div className="form-group flex-2">
                    <label>Usuário do Jogador</label>
                    <select 
                      className="journey-input" 
                      value={selectedUserId} 
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      disabled={!isGM}
                    >
                      <option value="">Nenhum (Controle do Mestre)</option>
                      {profiles.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.display_name || p.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="form-row mt-2">
                <div className="form-group flex-2">
                  <label>Classe</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select name="playerClass" className="journey-input" value={activeState.playerClass} onChange={handleChange}>
                      <option value="">Selecione...</option>
                      {DND5E_CLASSES.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                      <option value="custom">Outra (Personalizada)</option>
                    </select>
                    {activeState.playerClass === "custom" && (
                      <input type="text" name="customClass" className="journey-input" placeholder="Nome da classe" value={activeState.customClass} onChange={handleChange} />
                    )}
                  </div>
                </div>
                
                {(() => {
                  const cls = DND5E_CLASSES.find(c => c.id === activeState.playerClass);
                  if (cls && cls.subclasses && cls.subclasses.length > 0 && parseInt(activeState.playerLevel) >= (cls.subclasses[0].minLevel || 3)) {
                    return (
                      <div className="form-group flex-2">
                        <label>Subclasse / Juramento</label>
                        <select name="subclass" className="journey-input" value={activeState.subclass} onChange={handleChange}>
                          <option value="">Selecione...</option>
                          {cls.subclasses.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.label}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="form-group flex-1">
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Nível</span>
                    <button type="button" onClick={() => setIsLevelUpModalOpen(true)} className="btn success-btn small-btn" style={{ padding: "0 6px", fontSize: "0.65rem", height: "18px" }}>⭐ Subir</button>
                  </label>
                  <input type="number" name="playerLevel" className="journey-input" value={activeState.playerLevel} min="1" onChange={handleChange} />
                </div>
                <div className="form-group flex-2">
                  <label>Raça</label>
                  <input type="text" name="race" className="journey-input" value={activeState.race} onChange={handleChange} />
                </div>
              </div>
              
              <h4 className="form-section-title mt-4">Atributos Base</h4>
              <div className="form-attr-row">
                <div className="form-group"><label>FOR</label><input type="number" name="str" className="journey-input" value={activeState.str} min="0" onChange={handleChange} /></div>
                <div className="form-group"><label>DES</label><input type="number" name="dex" className="journey-input" value={activeState.dex} min="0" onChange={handleChange} /></div>
                <div className="form-group"><label>CON</label><input type="number" name="con" className="journey-input" value={activeState.con} min="0" onChange={handleChange} /></div>
                <div className="form-group"><label>INT</label><input type="number" name="int" className="journey-input" value={activeState.int} min="0" onChange={handleChange} /></div>
                <div className="form-group"><label>SAB</label><input type="number" name="wis" className="journey-input" value={activeState.wis} min="0" onChange={handleChange} /></div>
                <div className="form-group"><label>CAR</label><input type="number" name="cha" className="journey-input" value={activeState.cha} min="0" onChange={handleChange} /></div>
              </div>

              <h4 className="form-section-title mt-4">Estatísticas Vitais</h4>
              <div className="form-row">
                <div className="form-group flex-1"><label>PV Máx</label><input type="number" name="hpMax" className="journey-input" min="0" value={activeState.hpMax} onChange={handleChange} /></div>
                <div className="form-group flex-1"><label>CA</label><input type="number" name="ac" className="journey-input" min="0" value={activeState.ac} onChange={handleChange} /></div>
                <div className="form-group flex-1"><label>Iniciativa</label><input type="text" name="init" className="journey-input" value={activeState.init} onChange={handleChange} /></div>
                <div className="form-group flex-1"><label>Deslocamento</label><input type="text" name="speed" className="journey-input" value={activeState.speed} onChange={handleChange} /></div>
                <div className="form-group flex-1"><label>Percepção Pas.</label><input type="number" name="perc" className="journey-input" min="0" value={activeState.perc} onChange={handleChange} /></div>
                <div className="form-group flex-1"><label>Descanso Mín.</label><input type="number" name="minSleepReq" className="journey-input" min="0" value={activeState.minSleepReq} onChange={handleChange} title="Tempo mínimo de sono em horas" /></div>
              </div>

              <h4 className="form-section-title mt-4">Combate & Ataques (D&D 5e)</h4>
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Dado de Vida Total (ex: 3d10 ou 1d8)</label>
                  <input type="text" name="hdTotal" className="journey-input" placeholder="ex: 1d10" value={activeState.hdTotal} onChange={handleChange} />
                </div>
                <div className="form-group flex-1" style={{ display: "flex", alignItems: "center", marginTop: "24px" }}>
                  <label className="custom-checkbox-container">
                    <input type="checkbox" name="inspiration" checked={activeState.inspiration} onChange={handleChange} /> Conceder Inspiração?
                  </label>
                </div>
              </div>

              <label style={{ marginTop: "14px", marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                <span>Ataques Rápidos (ex: Espada, Arco, Magias)</span>
                <button type="button" onClick={addAttack} className="btn success-btn small-btn" style={{ padding: "2px 8px", fontSize: "0.7rem", height: "auto" }}>
                  + Adicionar Ataque
                </button>
              </label>
              {activeAttacks.map((atk, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px', padding: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px' }}>
                  <div className="form-row" style={{ gap: "8px" }}>
                    <div className="form-group flex-3"><input type="text" className="journey-input" placeholder="Nome da Arma/Ataque" value={atk.name} onChange={(e) => handleAttackChange(index, "name", e.target.value)} /></div>
                    <div className="form-group flex-1"><input type="text" className="journey-input" placeholder="Bônus" value={atk.bonus} onChange={(e) => handleAttackChange(index, "bonus", e.target.value)} /></div>
                    <div className="form-group flex-2"><input type="text" className="journey-input" placeholder="Dano/Tipo" value={atk.dmg} onChange={(e) => handleAttackChange(index, "dmg", e.target.value)} /></div>
                  </div>
                  <div className="form-row" style={{ gap: "8px", marginTop: "4px" }}>
                    <div className="form-group flex-1">
                      <select className="journey-input" value={atk.actionCost || 'action'} onChange={(e) => handleAttackChange(index, 'actionCost', e.target.value)}>
                        <option value="action">Ação</option>
                        <option value="bonus">Ação Bônus</option>
                        <option value="reaction">Reação</option>
                        <option value="free">Ação Gratuita</option>
                      </select>
                    </div>
                    <div className="form-group flex-1">
                      <select className="journey-input" value={atk.resourceCost?.resourceName || ''} onChange={(e) => {
                        if (!e.target.value) handleAttackChange(index, 'resourceCost', undefined as any);
                        else handleAttackChange(index, 'resourceCost', { resourceName: e.target.value, amount: atk.resourceCost?.amount || 1 } as any);
                      }}>
                        <option value="">Sem Custo Extra</option>
                        {activeState.classResources?.map((res: any) => (
                          <option key={res.id} value={res.name}>{res.name}</option>
                        ))}
                      </select>
                    </div>
                    {atk.resourceCost?.resourceName && (
                      <div className="form-group" style={{ width: '80px' }}>
                        <input type="number" className="journey-input" placeholder="Qtd" value={atk.resourceCost.amount || 1} min="1" onChange={(e) => handleAttackChange(index, 'resourceCost', { ...atk.resourceCost, amount: parseInt(e.target.value) || 1 } as any)} title="Quantidade gasta" />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <h4 className="form-section-title mt-4">Proficiências (D&D 5e)</h4>
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Bônus de Proficiência</label>
                  <input type="number" name="profBonus" className="journey-input" value={activeState.profBonus} onChange={handleChange} min="0" />
                </div>
              </div>
              <div className="form-row mt-2">
                <div className="form-group flex-1">
                  <label>Salvaguardas com Proficiência</label>
                  <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                    {SAVES_LIST.map(save => (
                      <label key={save} className="custom-checkbox-container" style={{ fontSize: "0.85rem", fontWeight: "bold", display: "flex", alignItems: "center" }}>
                        <input type="checkbox" checked={activeSaves.includes(save)} onChange={(e) => handleSavesChange(save, e.target.checked)} /> {save}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-row mt-2">
                <div className="form-group flex-1">
                  <label>Perícias com Proficiência</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px", background: "rgba(0,0,0,0.2)", padding: "15px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                    {SKILLS_LIST.map(skill => {
                      const isProficient = activeSkills.includes(skill);
                      const isExpert = isEditingTransformation ? transExpertiseSkills.includes(skill) : expertiseSkills.includes(skill);
                      // Mostra opção de expertise se classe for Ladino ou Bardo e for proficiente
                      const canHaveExpertise = (activeState.playerClass === 'ladino' || activeState.playerClass === 'bardo') && isProficient;
                      
                      return (
                        <div key={skill} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <label className="custom-checkbox-container" style={{ fontSize: "0.85rem", display: "flex", alignItems: "center" }}>
                            <input type="checkbox" checked={isProficient} onChange={(e) => handleSkillsChange(skill, e.target.checked)} /> {skill}
                          </label>
                          {canHaveExpertise && (
                            <label className="custom-checkbox-container" style={{ fontSize: "0.7rem", display: "flex", alignItems: "center", marginLeft: "20px", color: "var(--accent-primary)" }}>
                              <input type="checkbox" checked={isExpert} onChange={(e) => handleExpertiseChange(skill, e.target.checked)} /> Expertise (2x)
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <h4 className="form-section-title mt-4">Tipos de Dano (Resistências e Imunidades)</h4>
              <DamageTypeSelector
                resistances={activeState.resistances}
                immunities={activeState.immunities}
                onResistancesChange={(res) => isEditingTransformation ? setTransFormState(prev => ({ ...prev, resistances: res })) : setFormState(prev => ({ ...prev, resistances: res }))}
                onImmunitiesChange={(imm) => isEditingTransformation ? setTransFormState(prev => ({ ...prev, immunities: imm })) : setFormState(prev => ({ ...prev, immunities: imm }))}
              />

              <ClassResourcesSection 
                resources={activeState.classResources}
                onChange={(resources) => {
                  if (isEditingTransformation) setTransFormState(prev => ({ ...prev, classResources: resources }));
                  else setFormState(prev => ({ ...prev, classResources: resources }));
                }}
                playerClass={activeState.playerClass}
                playerLevel={parseInt(activeState.playerLevel) || 1}
              />

              <AbilitiesSection
                abilities={activeState.abilities}
                onChange={(ab) => isEditingTransformation ? setTransFormState(prev => ({ ...prev, abilities: ab })) : setFormState(prev => ({ ...prev, abilities: ab }))}
                classResources={activeState.classResources}
                playerClass={activeState.playerClass}
                playerLevel={parseInt(activeState.playerLevel) || 1}
              />

              {(activeState.playerClass === 'custom' || isCaster(activeState.playerClass) || activeState.hasSpells) && (
                <SpellsSection
                  spellcastingAbility={activeState.spellcastingAbility}
                  onAbilityChange={(val) => handleChange({ target: { name: 'spellcastingAbility', value: val } } as any)}
                  spellSlotType={activeState.spellSlotType}
                  onSlotTypeChange={(val) => handleChange({ target: { name: 'spellSlotType', value: val } } as any)}
                  playerClass={activeState.playerClass}
                />
              )}
            </div>
          </div>
        </form>
        <footer className="modal-footer">
          <button type="button" className="btn danger-btn" onClick={onClose}><span>Cancelar</span></button>
          <button type="submit" className="btn primary-btn" onClick={(e) => {
            const form = (e.target as HTMLElement).closest('.modal-content')?.querySelector('form');
            if (form) form.requestSubmit();
          }}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            <span>Salvar Personagem</span>
          </button>
        </footer>
      </div>
      <CropModal 
        isOpen={isCropModalOpen} 
        onClose={() => setIsCropModalOpen(false)} 
        imageUrl={cropImageSrc} 
        onCrop={handleCropComplete} 
      />
      <LevelUpModal
        isOpen={isLevelUpModalOpen}
        onClose={() => setIsLevelUpModalOpen(false)}
        onConfirm={(updates) => {
          if (isEditingTransformation) {
            setTransFormState(prev => ({ ...prev, ...updates }));
          } else {
            setFormState(prev => ({ ...prev, ...updates }));
          }
        }}
        currentLevel={parseInt(activeState.playerLevel) || 1}
        playerClass={activeState.playerClass}
        conModifier={Math.floor(((parseInt(activeState.con) || 10) - 10) / 2)}
        currentProfBonus={activeState.profBonus}
        currentHdTotal={activeState.hdTotal}
        currentSpellSlots={activeState.spellSlots}
        currentHpMax={parseInt(activeState.hpMax) || 0}
      />
    </Modal>
  );
}
