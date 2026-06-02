import { blocosDeTempo, personagens, JornadaBloco } from "./gameData";

export const getInitialJornada = (): Record<number, { blocos: JornadaBloco[] }> => {
  const jornada: Record<number, { blocos: JornadaBloco[] }> = {};
  
  for (let d = 1; d <= 6; d++) {
    jornada[d] = {
      blocos: blocosDeTempo.map(() => ({
        weather: "",
        weatherEffect: "clear",
        timeline: [],
        plots: [],
        sidequests: [],
        acoesPersonagens: personagens.map((p) => ({
          nome: p,
          acoes: [],
          objetivos: [],
          concluido: false,
        })),
        playerSessions: {},
      })),
    };
  }
  
  return jornada;
};
