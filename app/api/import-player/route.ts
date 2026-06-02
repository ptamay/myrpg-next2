import { NextResponse } from "next/server";

// Timeout maior para dar tempo à IA de processar as imagens
export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    const { images } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "Nenhuma imagem recebida." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Chave da API do Gemini (GEMINI_API_KEY) não está configurada no servidor." }, { status: 500 });
    }

    // Preparar as partes para envio ao Gemini
    const parts: any[] = images.map((base64Url: string) => {
      // Remover o prefixo base64 como "data:image/jpeg;base64," ou "data:application/pdf;base64,"
      const match = base64Url.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\-+.]+);base64,(.+)$/);
      if (!match) return null;
      return {
        inlineData: {
          mimeType: match[1],
          data: match[2]
        }
      };
    }).filter(Boolean);

    if (parts.length === 0) {
      return NextResponse.json({ error: "As imagens enviadas não são válidas." }, { status: 400 });
    }

    parts.unshift({
      text: `Você é um assistente especialista em D&D 5e.
Extraia os dados da ficha de personagem da(s) imagem(ns) anexada(s).
Se algum campo não for encontrado, use o valor padrão indicado.

REGRAS OBRIGATÓRIAS DE FORMATO:
- "ac": APENAS número inteiro (ex: 15). NUNCA texto como "(armadura de couro)".
- "init": bônus com sinal (ex: "+3" ou "-1"). NUNCA "Vantagem" ou texto livre.
- "speed": formato "30 ft" ou "9 m". SEMPRE inclua a unidade.
- "profBonus": número com sinal (ex: "+2").
- "saves": APENAS siglas do array: ["FOR", "DES", "CON", "INT", "SAB", "CAR"].
- "skills": nome exato com atributo entre parênteses (ex: "Acrobacia (Des)").
- "attacks.bonus": bônus de acerto com sinal (ex: "+5").
- "attacks.dmg": fórmula de dado com tipo (ex: "1d6+3 cortante").

Retorne APENAS JSON válido com esta estrutura:
{
  "name": "Nome do Personagem",
  "playerClass": "Classe",
  "playerLevel": 1,
  "race": "Raça",
  "background": "",
  "str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10,
  "hpMax": 10,
  "ac": 10,
  "init": "+0",
  "speed": "30 ft",
  "perc": 10,
  "hdTotal": "1d10",
  "profBonus": "+2",
  "inspiration": false,
  "minSleepReq": 8,
  "saves": [],
  "skills": [],
  "attacks": [{ "name": "Arma", "bonus": "+4", "dmg": "1d6+2 cortante" }],
  "inventory": [],
  "notes": "",
  "personalGoals": ""
}`
    });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro da API Gemini:", errorText);
      
      let errorMsg = "Falha na comunicação com a API do Gemini.";
      try {
         const errJson = JSON.parse(errorText);
         if (errJson.error && errJson.error.message) {
            errorMsg = errJson.error.message;
         }
      } catch(e) {}

      return NextResponse.json({ error: "Erro do Gemini: " + errorMsg }, { status: 500 });
    }

    const responseData = await response.json();
    let text = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Tratamento de segurança caso o Gemini ainda assim retorne blocos markdown
    if (text.startsWith("\`\`\`json")) text = text.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();

    try {
      const parsedData = JSON.parse(text);
      return NextResponse.json(parsedData);
    } catch (err) {
      console.error("Falha ao fazer parse do JSON retornado pelo Gemini:", text);
      return NextResponse.json({ error: "O Gemini não retornou os dados em um formato JSON válido." }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Erro interno no endpoint import-player:", error);
    return NextResponse.json({ error: "Erro interno no servidor ao processar a requisição." }, { status: 500 });
  }
}
