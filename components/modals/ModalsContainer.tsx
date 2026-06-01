"use client";

import { useApp } from "@/contexts/AppContext";
import NpcFormModal from "./NpcFormModal";
import NpcDetailModal from "./NpcDetailModal";
import PlayerFormModal from "./PlayerFormModal";
import PlayerManageModal from "./PlayerManageModal";
import GlobalEventModal, { GlobalEventDetailModal } from "./GlobalEventModal";
import PassDayModal from "./PassDayModal";
import CropModal from "./CropModal";
import { MainQuestModal, MainQuestDetailModal, SideQuestModal, SideQuestDetailModal } from "./QuestModals";
import { NpcImportTextModal, NpcImportOptionsModal } from "./ImportModals";
import SummaryCardModal from "./SummaryCardModal";
import SessionPlayerModal from "./SessionPlayerModal";
import PlayerDetailModal from "./PlayerDetailModal";
import PersonalNoteModal, { PersonalNoteDetailModal } from "./PersonalNoteModal";

export default function ModalsContainer() {
  const { modals, setModals, activeData } = useApp();

  const close = (key: keyof typeof modals) => {
    setModals((prev: any) => ({ ...prev, [key]: false }));
  };

  const checkOpen = (key: string) => {
    const val = modals[key];
    if (!val) return false;
    if (typeof val === 'object') return !!val.isOpen;
    return !!val;
  };

  return (
    <>
      <style>{`
        .modal-content:not(.post-it-modal) {
           background: #09090b !important;
        }
      `}</style>
      <NpcFormModal isOpen={checkOpen("npcForm")} onClose={() => close("npcForm")} />
      <NpcDetailModal isOpen={checkOpen("npcDetail")} onClose={() => close("npcDetail")} npc={activeData} />
      
      <PlayerFormModal isOpen={checkOpen("playerForm")} onClose={() => close("playerForm")} />
      <PlayerManageModal isOpen={checkOpen("playerManage")} onClose={() => close("playerManage")} player={activeData} />
      <PlayerDetailModal isOpen={checkOpen("playerDetail")} onClose={() => close("playerDetail")} player={activeData} />
      
      <GlobalEventModal isOpen={checkOpen("globalEvent")} onClose={() => close("globalEvent")} />
      <GlobalEventDetailModal isOpen={checkOpen("globalEventDetail")} onClose={() => close("globalEventDetail")} />
      
      <PassDayModal isOpen={checkOpen("passDay")} onClose={() => close("passDay")} />

      <CropModal isOpen={checkOpen("crop")} onClose={() => close("crop")} />
      
      <MainQuestModal isOpen={checkOpen("mainQuest")} onClose={() => close("mainQuest")} />
      <MainQuestDetailModal isOpen={checkOpen("mainQuestDetail")} onClose={() => close("mainQuestDetail")} />
      
      <SideQuestModal isOpen={checkOpen("sideQuest")} onClose={() => close("sideQuest")} />
      <SideQuestDetailModal isOpen={checkOpen("sideQuestDetail")} onClose={() => close("sideQuestDetail")} />

      <NpcImportTextModal isOpen={checkOpen("importNpcText")} onClose={() => close("importNpcText")} />
      <NpcImportOptionsModal isOpen={checkOpen("importNpcOptions")} onClose={() => close("importNpcOptions")} />
      
      <SummaryCardModal isOpen={checkOpen("summaryCard")} onClose={() => close("summaryCard")} />
      
      <SessionPlayerModal isOpen={checkOpen("sessionPlayer")} onClose={() => close("sessionPlayer")} />

      <PersonalNoteModal isOpen={checkOpen("personalNote")} onClose={() => close("personalNote")} />
      <PersonalNoteDetailModal isOpen={checkOpen("personalNoteDetail")} onClose={() => close("personalNoteDetail")} />
    </>
  );
}
