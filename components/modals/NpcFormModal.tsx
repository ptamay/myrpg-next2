"use client";

import React, { useState, useRef, useEffect } from "react";
import Modal from "../ui/Modal";
import CropModal from "./CropModal";
import { useApp } from "@/contexts/AppContext";
import { useSystemDialog } from "@/contexts/SystemDialogContext";
import { Npc, SpellEntry, ClassResource, Ability } from "@/lib/gameData";
import { SAVES_LIST, SKILLS_LIST } from "@/lib/constants/dnd5e";
import { DND5E_CLASSES, isCaster, getCasterType, getSpellSlotsForLevel, getDefaultClassResources, getDefaultAbilities, getSpellcastingAbility } from "@/lib/constants/dnd5eClasses";
import SpellsSection from "../ui/SpellsSection";
import ClassResourcesSection from "../ui/ClassResourcesSection";
import AbilitiesSection from "../ui/AbilitiesSection";
import DamageTypeSelector from "../ui/DamageTypeSelector";
import { uploadBase64Image } from "@/lib/supabase/storage";

interface NpcFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const initialFormState = {
  name: "",
  title: "",
  faction: "neutral",
  race: "",
  alignment: "",
  cr: "",
  str: "10",
  dex: "10",
  con: "10",
  int: "10",
  wis: "10",
  cha: "10",
  hpMax: "",
  ac: "",
  init: "",
  speed: "",
  perc: "",
  mainAttack: "",
  res: "",
  imm: "",
  actions: "",
  mot: "",
  sec: "",
  traits: "",
  itemsVis: "",
  itemsHid: "",
  notes: "",
  isDead: false,
  isHidden: false,
  profBonus: "",
  saves: [] as string[],
  skills: [] as string[],
  hasSpells: false,
  spellcastingAbility: 'int' as "str" | "dex" | "con" | "int" | "wis" | "cha",
  spellSlotType: 'standard' as "pact" | "standard",
  spellSlots: {} as Record<number, number>,
  spellsKnown: [] as SpellEntry[],
  playerClass: "",
  playerLevel: "1",
  customClass: "",
  classResources: [] as ClassResource[],
  abilities: [] as Ability[],
  resistances: [] as string[],
  immunities: [] as string[],
  multiattackCount: "1"
};

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

const dataToFormState = (data: any) => ({
  name: data?.name || "",
  title: data?.title || "",
  faction: data?.faction || "neutral",
  race: data?.race || "",
  alignment: data?.alignment || "",
  cr: data?.cr || "",
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
  mainAttack: data?.mainAttack || "",
  res: data?.res || "",
  imm: data?.imm || "",
  actions: data?.actions || "",
  mot: data?.mot || "",
  sec: data?.sec || "",
  traits: data?.traits || "",
  itemsVis: data?.itemsVis || "",
  itemsHid: data?.itemsHid || "",
  notes: data?.notes || "",
  isDead: data?.isDead || false,
  isHidden: data?.isHidden || false,
  profBonus: data?.profBonus || "",
  multiattackCount: data?.multiattackCount?.toString() || "1",
  saves: data?.saves || [],
  skills: data?.skills || [],
  hasSpells: data?.hasSpells || false,
  spellcastingAbility: (data?.spellcastingAbility || 'int') as "str" | "dex" | "con" | "int" | "wis" | "cha",
  spellSlotType: (data?.spellSlotType || 'standard') as "pact" | "standard",
  spellSlots: data?.spellSlots || {},
  spellsKnown: data?.spellsKnown || [],
  playerClass: data?.playerClass || "",
  playerLevel: data?.playerLevel?.toString() || "1",
  customClass: data?.customClass || "",
  classResources: data?.classResources || [],
  abilities: data?.abilities || [],
  resistances: data?.resistances || [],
  immunities: data?.immunities || [],
});

export default function NpcFormModal({ isOpen, onClose }: NpcFormModalProps) {
  const { dadosGlobais, setDadosGlobais, salvarEstadoLocal, activeData, setModals, setActiveData } = useApp();
  const { showConfirm, showAlert } = useSystemDialog();
  
  // States for Original Form
  const [formState, setFormState] = useState(initialFormState);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [attacksState, setAttacksState] = useState<any[]>([]);

  // States for Transformation Form
  const [hasTransformation, setHasTransformation] = useState(false);
  const [isEditingTransformation, setIsEditingTransformation] = useState(false);
  const [transFormState, setTransFormState] = useState(initialFormState);
  const [transAvatarBase64, setTransAvatarBase64] = useState<string | null>(null);
  const [transAttacksState, setTransAttacksState] = useState<any[]>([]);

  // Stats arrays that aren't strings in formState
  const [selectedSaves, setSelectedSaves] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [transSelectedSaves, setTransSelectedSaves] = useState<string[]>([]);
  const [transSelectedSkills, setTransSelectedSkills] = useState<string[]>([]);

  // Crop modal state
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    const handleImportEvent = (e: any) => {
      const { data, target } = e.detail;
      if (target === 'transformation') {
         setTransFormState(prev => ({ ...prev, ...dataToFormState(data) }));
         setTransAttacksState(dataToAttacks(data));
         if (data.saves) setTransSelectedSaves(data.saves);
         if (data.skills) setTransSelectedSkills(data.skills);
      } else {
         setFormState(prev => ({ ...prev, ...dataToFormState(data) }));
         setAttacksState(dataToAttacks(data));
         if (data.saves) setSelectedSaves(data.saves);
         if (data.skills) setSelectedSkills(data.skills);
      }
    };
    window.addEventListener('npcImported', handleImportEvent);
    return () => window.removeEventListener('npcImported', handleImportEvent);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const justOpened = !prevIsOpenRef.current;
      
      if (activeData) {
        if (justOpened) {
          setAvatarBase64(activeData.image || null);
          setFormState(dataToFormState(activeData));
          setAttacksState(dataToAttacks(activeData));
          setSelectedSaves(activeData.saves || []);
          setSelectedSkills(activeData.skills || []);
          
          if (activeData.transformation) {
            setHasTransformation(true);
            setTransAvatarBase64(activeData.transformation.image || null);
            setTransFormState(dataToFormState(activeData.transformation));
            setTransAttacksState(dataToAttacks(activeData.transformation));
            setTransSelectedSaves(activeData.transformation.saves || []);
            setTransSelectedSkills(activeData.transformation.skills || []);
          } else {
            setHasTransformation(false);
            setTransAvatarBase64(null);
            setTransFormState(dataToFormState({ name: activeData.name + " (Transformado)" }));
            setTransAttacksState(dataToAttacks({}));
            setTransSelectedSaves([]);
            setTransSelectedSkills([]);
          }
          
          setIsEditingTransformation(activeData.isTransformed || false);
        }
      } else {
        if (justOpened) {
          setAvatarBase64(null);
          setFormState(initialFormState);
          setAttacksState(dataToAttacks({}));
          setSelectedSaves([]);
          setSelectedSkills([]);

          setHasTransformation(false);
          setTransAvatarBase64(null);
          setTransFormState(initialFormState);
          setTransAttacksState(dataToAttacks({}));
          setTransSelectedSaves([]);
          setTransSelectedSkills([]);
          
          setIsEditingTransformation(false);
        }
      }
      
      prevIsOpenRef.current = true;
    } else {
      prevIsOpenRef.current = false;
    }
  }, [isOpen, activeData]);

  // Use the active state depending on tab
  const activeState = isEditingTransformation ? transFormState : formState;
  const activeAvatar = isEditingTransformation ? transAvatarBase64 : avatarBase64;
  const activeAttacks = isEditingTransformation ? transAttacksState : attacksState;
  const activeSaves = isEditingTransformation ? transSelectedSaves : selectedSaves;
  const activeSkills = isEditingTransformation ? transSelectedSkills : selectedSkills;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue: string | boolean | Record<number, number> = value;
    if (type === 'checkbox') {
      finalValue = (e.target as HTMLInputElement).checked;
    }

    let updates: any = { [name]: finalValue };

    if (name === 'playerClass' && value !== 'custom' && value !== '') {
      const cls = DND5E_CLASSES.find(c => c.id === value);
      if (cls) {
        const level = isEditingTransformation ? transFormState.playerLevel : formState.playerLevel;
        const currentResources = isEditingTransformation ? transFormState.classResources : formState.classResources;
        const currentAbilities = isEditingTransformation ? transFormState.abilities : formState.abilities;

        if (currentResources.length === 0) {
          updates.classResources = getDefaultClassResources(value, parseInt(level) || 1);
        }
        if (currentAbilities.length === 0) {
          updates.abilities = getDefaultAbilities(value, parseInt(level) || 1);
        }
        
        const currentSubclass = isEditingTransformation ? transFormState.subclass : formState.subclass;
        
        if (isCaster(value, currentSubclass)) {
          updates.hasSpells = true;
          updates.spellcastingAbility = getSpellcastingAbility(value, currentSubclass);
          updates.spellSlotType = getCasterType(value, currentSubclass) === 'pact' ? 'pact' : 'standard';
          updates.spellSlots = getSpellSlotsForLevel(value, parseInt(level) || 1, currentSubclass);
        } else {
          updates.hasSpells = false;
        }
      }
    }

    if (isEditingTransformation) {
      setTransFormState(prev => ({ ...prev, ...updates }));
    } else {
      setFormState(prev => ({ ...prev, ...updates }));
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
      else setTransSelectedSkills(transSelectedSkills.filter(s => s !== skill));
    } else {
      if (checked) setSelectedSkills([...selectedSkills, skill]);
      else setSelectedSkills(selectedSkills.filter(s => s !== skill));
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
    if (isEditingTransformation) {
      setTransAvatarBase64(base64);
    } else {
      setAvatarBase64(base64);
    }
  };

  const handleAttackChange = (index: number, field: string, value: string) => {
    if (isEditingTransformation) {
      const newAttacks = [...transAttacksState];
      newAttacks[index] = { ...newAttacks[index], [field]: value };
      setTransAttacksState(newAttacks);
    } else {
      const newAttacks = [...attacksState];
      newAttacks[index] = { ...newAttacks[index], [field]: value };
      setAttacksState(newAttacks);
    }
  };

  const constructNpcObject = (state: typeof initialFormState, imgBase: string | null, prevData: any, savesList: string[], skillsList: string[], attacksList: any[]) => {
    const hpMax = parseInt(state.hpMax) || 0;
    return {
      name: state.name,
      title: state.title,
      faction: state.faction,
      race: state.race,
      alignment: state.alignment,
      cr: state.cr,
      str: parseInt(state.str) || 10,
      dex: parseInt(state.dex) || 10,
      con: parseInt(state.con) || 10,
      int: parseInt(state.int) || 10,
      wis: parseInt(state.wis) || 10,
      cha: parseInt(state.cha) || 10,
      hpMax,
      hpCurrent: prevData && prevData.hpCurrent !== undefined ? prevData.hpCurrent : (state.isDead ? 0 : hpMax),
      image: imgBase || undefined,
      isDead: state.isDead,
      isHidden: state.isHidden,
      ac: state.ac || "",
      init: state.init,
      speed: state.speed,
      perc: state.perc || "",
      attacks: attacksList.filter(a => a.name || a.bonus || a.dmg),
      mainAttack: state.mainAttack || (attacksList.filter(a => a.name || a.bonus || a.dmg).length > 0 ? attacksList.filter(a => a.name || a.bonus || a.dmg)[0].name : ""),
      res: state.res,
      imm: state.imm,
      actions: state.actions,
      mot: state.mot,
      sec: state.sec,
      traits: state.traits,
      itemsVis: state.itemsVis,
      itemsHid: state.itemsHid,
      notes: state.notes,
      saves: savesList,
      skills: skillsList,
      hasSpells: state.hasSpells,
      spellcastingAbility: state.spellcastingAbility,
      spellSlotType: state.spellSlotType,
      spellSlots: state.spellSlots,
      spellSlotsUsed: prevData?.spellSlotsUsed || {},
      spellsKnown: state.spellsKnown,
      profBonus: state.profBonus || "",
      multiattackCount: parseInt(state.multiattackCount) || 1,
      playerClass: state.playerClass,
      playerLevel: parseInt(state.playerLevel) || 1,
      customClass: state.customClass,
      classResources: state.classResources,
      abilities: state.abilities,
      resistances: state.resistances,
      immunities: state.immunities
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const isValidUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const id = (activeData?.id && isValidUUID(activeData.id)) ? activeData.id : crypto.randomUUID();
    
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

    // Original Form Data
    const npcData: Npc = {
      id,
      ...constructNpcObject(formState, finalAvatarUrl, activeData, selectedSaves, selectedSkills, attacksState),
      transformation: undefined,
      isTransformed: hasTransformation ? isEditingTransformation : false,
    } as Npc;

    // Transformation Data
    if (hasTransformation) {
      npcData.transformation = constructNpcObject(transFormState, finalTransAvatarUrl, activeData?.transformation, transSelectedSaves, transSelectedSkills, transAttacksState);
    }

    const newNpcs = [...(dadosGlobais.npcs || [])];
    if (activeData?.id) {
      const idx = newNpcs.findIndex(n => n.id === activeData.id);
      if (idx !== -1) {
        newNpcs[idx] = { ...newNpcs[idx], ...npcData };
      } else {
        newNpcs.push(npcData);
      }
    } else {
      newNpcs.push(npcData);
    }

    setDadosGlobais({ ...dadosGlobais, npcs: newNpcs });
    window.dispatchEvent(new CustomEvent('sync_entity_to_combat', { detail: { entity: npcData, type: 'npc' } }));
    setTimeout(salvarEstadoLocal, 100);
    onClose();
    setTimeout(() => showAlert({ title: "Sucesso", message: "Alterações Salvas", type: "success" }), 200);
  };

  const handleOpenImport = () => {
    const isValidUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const id = (activeData?.id && isValidUUID(activeData.id)) ? activeData.id : crypto.randomUUID();
    const currentActiveData = {
      id,
      ...constructNpcObject(formState, avatarBase64, activeData, selectedSaves, selectedSkills, attacksState),
      transformation: hasTransformation ? constructNpcObject(transFormState, transAvatarBase64, activeData?.transformation, transSelectedSaves, transSelectedSkills, transAttacksState) : undefined,
      importTarget: isEditingTransformation ? 'transformation' : 'original'
    };
    setActiveData(currentActiveData);
    setModals((prev: any) => ({ ...prev, importNpcText: true }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="npc-form-modal">
      <div className="modal-content modal-xl glass-panel">
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="modal-subtitle">Banco de Dados</span>
            <h2 className="modal-title">{isEditingTransformation ? "Ficha da Transformação" : activeData ? "Editar NPC" : "Novo NPC"}</h2>
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
            <button type="button" className="btn secondary-btn small-btn" onClick={handleOpenImport}>Importar via Texto</button>
            <button className="close-btn" onClick={onClose}>
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
              <div className="avatar-upload" onClick={() => fileInputRef.current?.click()} style={{ cursor: "pointer", border: isEditingTransformation ? "2px dashed var(--accent-primary)" : undefined }}>
                {activeAvatar ? (
                  <img src={activeAvatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "12px" }} />
                ) : (
                  <div className="avatar-placeholder">
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
                  <label>Nome *</label>
                  <input type="text" name="name" className="journey-input" required value={activeState.name} onChange={handleChange} />
                </div>
                <div className="form-group flex-2">
                  <label>Título / Ocupação</label>
                  <input type="text" name="title" className="journey-input" value={activeState.title} onChange={handleChange} />
                </div>
              </div>
              <div className="form-row mt-2">
                <div className="form-group flex-1">
                  <label>Facção</label>
                  <select name="faction" className="journey-input" value={activeState.faction} onChange={handleChange}>
                    <option value="ally">Aliado</option>
                    <option value="neutral">Neutro</option>
                    <option value="enemy">Inimigo</option>
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label>Raça</label>
                  <input type="text" name="race" className="journey-input" value={activeState.race} onChange={handleChange} />
                </div>
                <div className="form-group flex-1">
                  <label>Alinhamento</label>
                  <input type="text" name="alignment" className="journey-input" value={activeState.alignment} onChange={handleChange} />
                </div>
              </div>
              <div className="form-row mt-2">
                <div className="form-group flex-1">
                  <label>ND / CR</label>
                  <input type="text" name="cr" className="journey-input" placeholder="Ex: 3" value={activeState.cr} onChange={handleChange} />
                </div>
                <div className="form-group flex-1">
                  <label>Nível (Oculto / Engine)</label>
                  <input type="number" name="playerLevel" className="journey-input" value={activeState.playerLevel} onChange={handleChange} min="1" />
                </div>
                <div className="form-group flex-2">
                  <label>Classe Base (Oculto / Engine)</label>
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
              </div>

              <h4 className="form-section-title mt-4">Atributos Base</h4>
              <div className="form-attr-row">
                <div className="form-group"><label>FOR</label><input type="number" name="str" className="journey-input" value={activeState.str} onChange={handleChange} min="0" /></div>
                <div className="form-group"><label>DES</label><input type="number" name="dex" className="journey-input" value={activeState.dex} onChange={handleChange} min="0" /></div>
                <div className="form-group"><label>CON</label><input type="number" name="con" className="journey-input" value={activeState.con} onChange={handleChange} min="0" /></div>
                <div className="form-group"><label>INT</label><input type="number" name="int" className="journey-input" value={activeState.int} onChange={handleChange} min="0" /></div>
                <div className="form-group"><label>SAB</label><input type="number" name="wis" className="journey-input" value={activeState.wis} onChange={handleChange} min="0" /></div>
                <div className="form-group"><label>CAR</label><input type="number" name="cha" className="journey-input" value={activeState.cha} onChange={handleChange} min="0" /></div>
              </div>

              <h4 className="form-section-title mt-4">Estatísticas Vitais (Combate Rápido)</h4>
              <div className="form-row">
                <div className="form-group flex-1"><label>PV Máx</label><input type="number" name="hpMax" className="journey-input" placeholder="Ex: 45" value={activeState.hpMax} onChange={handleChange} /></div>
                <div className="form-group flex-1"><label>CA</label><input type="number" name="ac" className="journey-input" placeholder="Ex: 15" value={activeState.ac} onChange={handleChange} /></div>
                <div className="form-group flex-1"><label>Iniciativa</label><input type="text" name="init" className="journey-input" placeholder="Ex: +2" value={activeState.init} onChange={handleChange} /></div>
                <div className="form-group flex-1"><label>Deslocamento</label><input type="text" name="speed" className="journey-input" placeholder="Ex: 30 ft" value={activeState.speed} onChange={handleChange} /></div>
                <div className="form-group flex-1"><label>Percepção</label><input type="text" name="perc" className="journey-input" placeholder="Ex: 14" value={activeState.perc} onChange={handleChange} /></div>
              </div>
              
              <div className="form-row mt-3">
                <div className="form-group flex-1"><label>Bônus Proficiência</label><input type="text" name="profBonus" className="journey-input" placeholder="+2" value={activeState.profBonus} onChange={handleChange} /></div>
                <div className="form-group flex-1"><label>Ataques por Turno</label><input type="number" name="multiattackCount" className="journey-input" min="1" max="10" value={activeState.multiattackCount} onChange={handleChange} /></div>
              </div>
              
              <h4 className="form-section-title mt-4">Ações e Ataques</h4>
              <div className="form-group mt-2">
                <label>Ataques (Motor de Combate Automático)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  {activeAttacks.map((atk, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px', padding: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input type="text" className="journey-input" placeholder="Nome da Arma/Ataque" style={{ flex: 2 }} value={atk.name} onChange={(e) => handleAttackChange(i, 'name', e.target.value)} />
                        <input type="text" className="journey-input" placeholder="Acerto (+5)" style={{ flex: 1 }} value={atk.bonus} onChange={(e) => handleAttackChange(i, 'bonus', e.target.value)} />
                        <input type="text" className="journey-input" placeholder="Dano (1d8+3)" style={{ flex: 1 }} value={atk.dmg} onChange={(e) => handleAttackChange(i, 'dmg', e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <select className="journey-input" style={{ flex: 1 }} value={atk.actionCost || 'action'} onChange={(e) => handleAttackChange(i, 'actionCost', e.target.value)}>
                          <option value="action">Ação</option>
                          <option value="bonus">Ação Bônus</option>
                          <option value="reaction">Reação</option>
                          <option value="free">Ação Gratuita</option>
                        </select>
                        <select className="journey-input" style={{ flex: 1 }} value={atk.resourceCost?.resourceName || ''} onChange={(e) => {
                          if (!e.target.value) handleAttackChange(i, 'resourceCost', undefined as any);
                          else handleAttackChange(i, 'resourceCost', { resourceName: e.target.value, amount: atk.resourceCost?.amount || 1 } as any);
                        }}>
                          <option value="">Sem Custo Extra</option>
                          {activeState.classResources?.map((res: any) => (
                            <option key={res.id} value={res.name}>{res.name}</option>
                          ))}
                        </select>
                        {atk.resourceCost?.resourceName && (
                          <input type="number" className="journey-input" style={{ width: '80px' }} placeholder="Qtd" value={atk.resourceCost.amount || 1} min="1" onChange={(e) => handleAttackChange(i, 'resourceCost', { ...atk.resourceCost, amount: parseInt(e.target.value) || 1 } as any)} title="Quantidade" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group mt-3">
                <label>Ataque Principal (Resumo / Texto Secundário)</label>
                <input type="text" name="mainAttack" className="journey-input" placeholder="Ex: Punhal: +5 acerto, 1d4+3 perfurante" value={activeState.mainAttack} onChange={handleChange} />
              </div>
              
              <div className="form-row mt-4">
                <div className="form-group flex-1">
                  <label className="custom-checkbox">
                    <input type="checkbox" name="isDead" checked={activeState.isDead} onChange={handleChange} />
                    <span className="checkmark"></span>
                    <span>NPC está Morto / Caído?</span>
                  </label>
                </div>
                <div className="form-group flex-1">
                  <label className="custom-checkbox">
                    <input type="checkbox" name="isHidden" checked={activeState.isHidden} onChange={handleChange} />
                    <span className="checkmark"></span>
                    <span>NPC está Oculto?</span>
                  </label>
                </div>
              </div>

              <h4 className="form-section-title mt-4">Detalhes de Combate</h4>
              <div className="form-row">
                <div className="form-group flex-1"><label>Bônus de Proficiência</label><input type="text" name="profBonus" className="journey-input" placeholder="Ex: +2" value={activeState.profBonus} onChange={handleChange} /></div>
              </div>
              
              <div className="form-group mt-3">
                <label style={{ display: 'block', marginBottom: '8px' }}>Salvaguardas (Saves) com Proficiência</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {SAVES_LIST.map(s => (
                    <label key={s} className="custom-checkbox" style={{ marginRight: '10px' }}>
                      <input 
                        type="checkbox" 
                        checked={activeSaves.includes(s)}
                        onChange={(e) => handleSavesChange(s, e.target.checked)}
                      />
                      <span className="checkmark"></span>
                      <span>{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group mt-3">
                <label style={{ display: 'block', marginBottom: '8px' }}>Perícias (Skills) com Proficiência</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                  {SKILLS_LIST.map(skill => (
                    <label key={skill} className="custom-checkbox">
                      <input 
                        type="checkbox" 
                        checked={activeSkills.includes(skill)}
                        onChange={(e) => handleSkillsChange(skill, e.target.checked)}
                      />
                      <span className="checkmark"></span>
                      <span style={{ fontSize: '0.85rem' }}>{skill}</span>
                    </label>
                  ))}
                </div>
              </div>

              <h4 className="form-section-title mt-4">Tipos de Dano (Resistências e Imunidades)</h4>
              <DamageTypeSelector
                resistances={activeState.resistances}
                immunities={activeState.immunities}
                onResistancesChange={(res) => isEditingTransformation ? setTransFormState(prev => ({ ...prev, resistances: res })) : setFormState(prev => ({ ...prev, resistances: res }))}
                onImmunitiesChange={(imm) => isEditingTransformation ? setTransFormState(prev => ({ ...prev, immunities: imm })) : setFormState(prev => ({ ...prev, immunities: imm }))}
              />
              <div className="form-row mt-4">
                <div className="form-group flex-1"><label>Resistências (Legado/Extra)</label><input type="text" name="res" className="journey-input" value={activeState.res} onChange={handleChange} /></div>
                <div className="form-group flex-1"><label>Imunidades (Legado/Extra)</label><input type="text" name="imm" className="journey-input" value={activeState.imm} onChange={handleChange} /></div>
              </div>
              <div className="form-group mt-2"><label>Ações Completas (Texto Livre)</label><textarea name="actions" className="journey-input form-textarea" value={activeState.actions} onChange={handleChange}></textarea></div>

              <ClassResourcesSection
                resources={activeState.classResources}
                onChange={(res) => isEditingTransformation ? setTransFormState(prev => ({ ...prev, classResources: res })) : setFormState(prev => ({ ...prev, classResources: res }))}
                playerClass={activeState.playerClass}
                playerLevel={parseInt(activeState.playerLevel)}
              />

              <AbilitiesSection
                abilities={activeState.abilities}
                onChange={(ab) => isEditingTransformation ? setTransFormState(prev => ({ ...prev, abilities: ab })) : setFormState(prev => ({ ...prev, abilities: ab }))}
                classResources={activeState.classResources}
                playerClass={activeState.playerClass}
                playerLevel={parseInt(activeState.playerLevel)}
              />


              <h4 className="form-section-title mt-4">Teatro Mental & História</h4>
              <div className="form-row">
                <div className="form-group flex-1"><label>Motivações</label><textarea name="mot" className="journey-input form-textarea" value={activeState.mot} onChange={handleChange}></textarea></div>
                <div className="form-group flex-1"><label>Segredos e Fraquezas</label><textarea name="sec" className="journey-input form-textarea" value={activeState.sec} onChange={handleChange}></textarea></div>
              </div>
              <div className="form-group mt-2"><label>Traços / Adjetivos</label><input type="text" name="traits" className="journey-input" value={activeState.traits} onChange={handleChange} /></div>

              <h4 className="form-section-title mt-4">Inventário e Notas</h4>
              <div className="form-row">
                <div className="form-group flex-1"><label>Itens Visíveis</label><textarea name="itemsVis" className="journey-input form-textarea" value={activeState.itemsVis} onChange={handleChange}></textarea></div>
                <div className="form-group flex-1"><label>Itens Escondidos</label><textarea name="itemsHid" className="journey-input form-textarea" value={activeState.itemsHid} onChange={handleChange}></textarea></div>
              </div>
              <div className="form-group mt-2"><label>Notas do Mestre</label><textarea name="notes" className="journey-input form-textarea" style={{ minHeight: "120px" }} value={activeState.notes} onChange={handleChange}></textarea></div>

              <SpellsSection
                spellcastingAbility={activeState.spellcastingAbility}
                onAbilityChange={(val) => handleChange({ target: { name: 'spellcastingAbility', value: val } } as any)}
                spellSlotType={activeState.spellSlotType}
                onSlotTypeChange={(val) => handleChange({ target: { name: 'spellSlotType', value: val } } as any)}
                playerClass={activeState.playerClass}
              />
            </div>
          </div>
        </form>
        <footer className="modal-footer" style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" className="btn danger-btn" onClick={onClose}><span>Cancelar</span></button>
            {activeData && (
              <button type="button" className="btn danger-btn" onClick={async () => {
                if (await showConfirm({ title: "Excluir NPC", message: `Tem certeza que deseja excluir o NPC "${activeData.name}" permanentemente?`, type: "danger" })) {
                  const newNpcs = dadosGlobais.npcs.filter((n: any) => n.id !== activeData.id);
                  setDadosGlobais({ ...dadosGlobais, npcs: newNpcs });
                  setTimeout(salvarEstadoLocal, 100);
                  onClose();
                  setTimeout(() => showAlert({ title: "Sucesso", message: "NPC excluido com sucesso", type: "success" }), 200);
                }
              }}>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" style={{ marginRight: "4px" }}>
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Excluir</span>
              </button>
            )}
          </div>
          <button type="submit" className="btn primary-btn" onClick={(e) => {
            const form = (e.target as HTMLElement).closest('.modal-content')?.querySelector('form');
            if (form) form.requestSubmit();
          }}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            <span>Salvar NPC</span>
          </button>
        </footer>
      </div>
      <CropModal 
        isOpen={isCropModalOpen} 
        onClose={() => setIsCropModalOpen(false)} 
        imageUrl={cropImageSrc} 
        onCrop={handleCropComplete} 
      />
    </Modal>
  );
}
