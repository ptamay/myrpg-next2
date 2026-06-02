"use client";

import React, { useState, useRef, useEffect } from "react";
import Modal from "../ui/Modal";
import CropModal from "./CropModal";
import { useAppContext } from "@/contexts/AppContext";
import { useSystemDialog } from "@/contexts/SystemDialogContext";
import { Npc } from "@/lib/gameData";

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
  s1: "0",
  s2: "0",
  s3: "0",
  s4: "0",
  s5: "0",
  s6: "0",
  s7: "0",
  s8: "0",
  s9: "0",
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
  s1: data?.spellSlots?.[1]?.toString() || "0",
  s2: data?.spellSlots?.[2]?.toString() || "0",
  s3: data?.spellSlots?.[3]?.toString() || "0",
  s4: data?.spellSlots?.[4]?.toString() || "0",
  s5: data?.spellSlots?.[5]?.toString() || "0",
  s6: data?.spellSlots?.[6]?.toString() || "0",
  s7: data?.spellSlots?.[7]?.toString() || "0",
  s8: data?.spellSlots?.[8]?.toString() || "0",
  s9: data?.spellSlots?.[9]?.toString() || "0",
});

export default function NpcFormModal({ isOpen, onClose }: NpcFormModalProps) {
  const { dadosGlobais, setDadosGlobais, salvarEstadoLocal, activeData, setModals, setActiveData } = useAppContext();
  const { showConfirm, showAlert } = useSystemDialog();
  
  // States for Original Form
  const [formState, setFormState] = useState(initialFormState);
  const [hasSpells, setHasSpells] = useState(false);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);

  // States for Transformation Form
  const [hasTransformation, setHasTransformation] = useState(false);
  const [isEditingTransformation, setIsEditingTransformation] = useState(false);
  const [transFormState, setTransFormState] = useState(initialFormState);
  const [transHasSpells, setTransHasSpells] = useState(false);
  const [transAvatarBase64, setTransAvatarBase64] = useState<string | null>(null);

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
         if (data.hasSpells !== undefined) setTransHasSpells(data.hasSpells);
      } else {
         setFormState(prev => ({ ...prev, ...dataToFormState(data) }));
         if (data.hasSpells !== undefined) setHasSpells(data.hasSpells);
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
          setHasSpells(activeData.hasSpells || false);
          setAvatarBase64(activeData.image || null);
          setFormState(dataToFormState(activeData));
          
          if (activeData.transformation) {
            setHasTransformation(true);
            setTransHasSpells(activeData.transformation.hasSpells || false);
            setTransAvatarBase64(activeData.transformation.image || null);
            setTransFormState(dataToFormState(activeData.transformation));
          } else {
            setHasTransformation(false);
            setTransHasSpells(false);
            setTransAvatarBase64(null);
            setTransFormState(dataToFormState({ name: activeData.name + " (Transformado)" }));
          }
          
          setIsEditingTransformation(activeData.isTransformed || false);
        }
      } else {
        if (justOpened) {
          setHasSpells(false);
          setAvatarBase64(null);
          setFormState(initialFormState);

          setHasTransformation(false);
          setTransHasSpells(false);
          setTransAvatarBase64(null);
          setTransFormState(initialFormState);
          
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
  const activeHasSpells = isEditingTransformation ? transHasSpells : hasSpells;
  const activeAvatar = isEditingTransformation ? transAvatarBase64 : avatarBase64;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue: string | boolean = value;
    if (type === 'checkbox') {
      finalValue = (e.target as HTMLInputElement).checked;
    }

    if (isEditingTransformation) {
      setTransFormState(prev => ({ ...prev, [name]: finalValue }));
    } else {
      setFormState(prev => ({ ...prev, [name]: finalValue }));
    }
  };

  const handleHasSpellsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isEditingTransformation) {
      setTransHasSpells(e.target.checked);
    } else {
      setHasSpells(e.target.checked);
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

  const constructNpcObject = (state: typeof initialFormState, isSpells: boolean, imgBase: string | null, prevData: any) => {
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
      mainAttack: state.mainAttack,
      res: state.res,
      imm: state.imm,
      actions: state.actions,
      mot: state.mot,
      sec: state.sec,
      traits: state.traits,
      itemsVis: state.itemsVis,
      itemsHid: state.itemsHid,
      notes: state.notes,
      hasSpells: isSpells,
      spellSlots: isSpells ? {
        1: parseInt(state.s1) || 0,
        2: parseInt(state.s2) || 0,
        3: parseInt(state.s3) || 0,
        4: parseInt(state.s4) || 0,
        5: parseInt(state.s5) || 0,
        6: parseInt(state.s6) || 0,
        7: parseInt(state.s7) || 0,
        8: parseInt(state.s8) || 0,
        9: parseInt(state.s9) || 0,
      } : undefined,
      spellSlotsUsed: prevData?.spellSlotsUsed || {},
    };
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const id = activeData?.id || crypto.randomUUID();
    
    // Original Form Data
    const npcData: Npc = {
      id,
      ...constructNpcObject(formState, hasSpells, avatarBase64, activeData),
      transformation: undefined,
      isTransformed: hasTransformation ? isEditingTransformation : false,
    } as Npc;

    // Transformation Data
    if (hasTransformation) {
      npcData.transformation = constructNpcObject(transFormState, transHasSpells, transAvatarBase64, activeData?.transformation);
    }

    const newNpcs = [...(dadosGlobais.npcs || [])];
    if (activeData?.id) {
      const idx = newNpcs.findIndex(n => n.id === id);
      if (idx !== -1) newNpcs[idx] = { ...newNpcs[idx], ...npcData };
    } else {
      newNpcs.push(npcData);
    }

    setDadosGlobais({ ...dadosGlobais, npcs: newNpcs });
    setTimeout(salvarEstadoLocal, 100);
    onClose();
    setTimeout(() => showAlert({ title: "Sucesso", message: "Alterações Salvas", type: "success" }), 200);
  };

  const handleOpenImport = () => {
    const id = activeData?.id || crypto.randomUUID();
    const currentActiveData = {
      id,
      ...constructNpcObject(formState, hasSpells, avatarBase64, activeData),
      transformation: hasTransformation ? constructNpcObject(transFormState, transHasSpells, transAvatarBase64, activeData?.transformation) : undefined,
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
                <div className="form-group flex-1">
                  <label>ND / CR</label>
                  <input type="text" name="cr" className="journey-input" placeholder="Ex: 3" value={activeState.cr} onChange={handleChange} />
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
              <div className="form-group mt-2">
                <label>Ataque Principal (Resumo)</label>
                <input type="text" name="mainAttack" className="journey-input" placeholder="Ex: Punhal: +5 acerto, 1d4+3 perfurante" value={activeState.mainAttack} onChange={handleChange} />
              </div>
              
              <div className="form-row mt-4">
                <div className="form-group flex-1">
                  <label className="custom-checkbox">
                    <input type="checkbox" checked={activeHasSpells} onChange={handleHasSpellsChange} />
                    <span className="checkmark"></span>
                    <span>Este NPC possui Espaços de Magia?</span>
                  </label>
                </div>
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
              
              {activeHasSpells && (
                <div className="spell-slots-inputs mt-2">
                  <div className="slot-field"><label>1º</label><input type="number" name="s1" min="0" value={activeState.s1} onChange={handleChange} /></div>
                  <div className="slot-field"><label>2º</label><input type="number" name="s2" min="0" value={activeState.s2} onChange={handleChange} /></div>
                  <div className="slot-field"><label>3º</label><input type="number" name="s3" min="0" value={activeState.s3} onChange={handleChange} /></div>
                  <div className="slot-field"><label>4º</label><input type="number" name="s4" min="0" value={activeState.s4} onChange={handleChange} /></div>
                  <div className="slot-field"><label>5º</label><input type="number" name="s5" min="0" value={activeState.s5} onChange={handleChange} /></div>
                  <div className="slot-field"><label>6º</label><input type="number" name="s6" min="0" value={activeState.s6} onChange={handleChange} /></div>
                  <div className="slot-field"><label>7º</label><input type="number" name="s7" min="0" value={activeState.s7} onChange={handleChange} /></div>
                  <div className="slot-field"><label>8º</label><input type="number" name="s8" min="0" value={activeState.s8} onChange={handleChange} /></div>
                  <div className="slot-field"><label>9º</label><input type="number" name="s9" min="0" value={activeState.s9} onChange={handleChange} /></div>
                </div>
              )}

              <h4 className="form-section-title mt-4">Detalhes de Combate</h4>
              <div className="form-row">
                <div className="form-group flex-1"><label>Resistências</label><input type="text" name="res" className="journey-input" value={activeState.res} onChange={handleChange} /></div>
                <div className="form-group flex-1"><label>Imunidades</label><input type="text" name="imm" className="journey-input" value={activeState.imm} onChange={handleChange} /></div>
              </div>
              <div className="form-group mt-2"><label>Ações Completas (Texto Livre)</label><textarea name="actions" className="journey-input form-textarea" value={activeState.actions} onChange={handleChange}></textarea></div>

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
