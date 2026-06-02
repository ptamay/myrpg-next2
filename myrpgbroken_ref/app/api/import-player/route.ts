import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'gm') {
      return NextResponse.json({ error: "Acesso negado. Apenas o mestre pode importar jogadores." }, { status: 403 });
    }

    const { images } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "Nenhuma imagem fornecida." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Chave da API do Gemini não configurada." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Você é um assistente especializado em extrair dados de fichas de personagens de RPG (D&D 5e e similares).
O usuário forneceu documento(s) (imagem ou PDF) da sua ficha de personagem. Analise o documento e extraia as seguintes informações em formato JSON, seguindo EXATAMENTE esta estrutura (omita campos se não encontrar):
{
  "name": "string (Nome do personagem)",
  "playerName": "string (Nome do jogador, se houver)",
  "playerClass": "string (Apenas a Classe, ex: Guerreiro)",
  "playerLevel": number (Apenas o nível numérico, ex: 3),
  "race": "string (Raça)",
  "str": "string (Valor do atributo Força, ex: 15)",
  "dex": "string",
  "con": "string",
  "int": "string",
  "wis": "string",
  "cha": "string",
  "hpMax": number (Pontos de vida máximos, ex: 25),
  "ac": "string (Classe de Armadura, ex: 16)",
  "init": "string (Iniciativa, ex: +2)",
  "speed": "string (Deslocamento, ex: 9m ou 30ft)",
  "perc": "string (Percepção Passiva, ex: 12)",
  "hdTotal": "string (Dado de Vida Total, ex: 3d10)",
  "profBonus": number (Apenas o número do Bônus de Proficiência, sem o sinal de +, ex: 2),
  "attacks": [
    { "name": "string (Nome da Arma)", "bonus": "string (Bônus)", "dmg": "string (Dano/Tipo)" }
  ],
  "saves": [
    "string (Exatamente e somente: FOR, DES, CON, INT, SAB ou CAR. REGRA VISUAL ABSOLUTA: Há um pequeno círculo à esquerda de cada salvaguarda. Só inclua se o círculo estiver TOTALMENTE PREENCHIDO/PINTADO (●) ou marcado com um X. Se o círculo estiver VAZIO (○), NÃO INCLUA, mesmo que exista um número! Se for um PDF preenchível, verifique se a caixa de seleção está 'ativada'.)"
  ],
  "skills": [
    "string (Use exatamente os nomes: Acrobacia (Des), Arcanismo (Int), Atletismo (For), Atuação (Car), Enganação (Car), Furtividade (Des), História (Int), Intimidação (Car), Intuição (Sab), Investigação (Int), Lidar c/ Animais (Sab), Medicina (Sab), Natureza (Int), Percepção (Sab), Persuasão (Car), Prestidigitação (Des), Religião (Int), Sobrevivência (Sab). REGRA VISUAL ABSOLUTA: Só inclua se o círculo à esquerda da perícia estiver TOTALMENTE PREENCHIDO/PINTADO (●) ou marcado com um X. Círculos vazios (○) NÃO SÃO PROFICIÊNCIAS, ignore-os! Se for um PDF preenchível, verifique se o checkbox correspondente está 'ativado'.)"
  ]
}

NÃO extraia magias. Construa o JSON estritamente com os inputs definidos acima, sem adicionar novas chaves.

Responda APENAS com o JSON válido, sem nenhum texto extra e sem formatação markdown de bloco de código (\`\`\`json). O retorno deve ser parseável diretamente via JSON.parse().`;

    const parts = [
      prompt,
      ...images.map((base64Image: string) => {
        let mimeType = "image/jpeg";
        let base64Data = base64Image;
        
        const match = base64Image.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        } else {
          // Fallback para caso venha sem prefixo (já limpo no front ou afim)
          base64Data = base64Image;
        }
        
        return {
          inlineData: {
            data: base64Data,
            mimeType
          }
        };
      })
    ];

    const result = await model.generateContent(parts);
    const response = await result.response;
    let textResult = response.text();
    
    // Limpar possíveis formatações markdown que o modelo ainda possa retornar
    textResult = textResult.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const parsedData = JSON.parse(textResult);
      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error("Erro ao fazer parse do JSON retornado pelo Gemini:", textResult);
      return NextResponse.json({ error: "Ocorreu um erro ao extrair os dados da ficha." }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Erro na importação via Gemini:", error);
    return NextResponse.json({ error: error.message || "Erro interno no servidor." }, { status: 500 });
  }
}
