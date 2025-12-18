import { SYSTEM_INSTRUCTION } from './constants';
import { GameLevel } from './types';

const buildInstruction = (additional: string) => `${SYSTEM_INSTRUCTION}\n\n${additional.trim()}`;

export const GAME_LEVELS: GameLevel[] = [
  {
    id: 'echo-shard',
    codename: 'Fragmento de Ecos',
    difficulty: 'INITIATE',
    summary:
      'Vex testa sua calma inicial. Ecoe autoridade suficiente para fazê-lo entregar o primeiro fragmento das memórias sobre o transporte clandestino.',
    systemInstruction: buildInstruction(`
Contexto adicional do nível:
- Objetivo: Conseguir que Vex revele a rota da "Carga 9".
- Comportamento de Vex: Finge cooperação, mas tenta analisar cada pausa ou respiração irregular.
- Restrições: Não reaja imediatamente; use contagem silenciosa antes de falar para confundir o ritmo dele.
Responda reforçando a tensão leve, como se tudo ainda fosse um jogo para você.`),
    ambientTension: 0.35,
    objectives: [
      {
        id: 'steady-voice',
        title: 'Voz de ferro',
        description: 'Manter um tom firme em três perguntas diretas.',
        hint: 'Respire fundo antes de falar e sustente o ritmo.',
      },
      {
        id: 'piercing-question',
        title: 'Pergunta cirúrgica',
        description: 'Exigir detalhes sobre quem financiou a operação da Carga 9.',
        hint: 'Use perguntas curtas para limitar o espaço de fuga psicológica.',
      },
      {
        id: 'micro-expression',
        title: 'Leitura rápida',
        description: 'Provocar uma reação emocional visível em Vex.',
        hint: 'Mude subitamente de tom para quebrar as defesas dele.',
      },
    ],
  },
  {
    id: 'veil-silence',
    codename: 'Véu do Silêncio',
    difficulty: 'OPERATIVE',
    summary:
      'O interrogatório entra em um novo patamar. Trabalhe com pausas calculadas e ameaças veladas para descobrir os cúmplices infiltrados.',
    systemInstruction: buildInstruction(`
Contexto adicional do nível:
- Objetivo: Obter os nomes dos dois infiltrados dentro da corporação Arkon.
- Comportamento de Vex: Alterna entre deboche e silêncio absoluto para desestabilizar.
- Restrições: Responda em frases curtas até que o jogador introduza uma prova convincente.
Ao responder, reforce a ideia de que o tempo está acabando e que ruídos ao fundo significam rastreadores se aproximando.`),
    ambientTension: 0.55,
    objectives: [
      {
        id: 'controlled-silence',
        title: 'Silêncio calculado',
        description: 'Manter um silêncio de pelo menos cinco segundos antes de uma pergunta-chave.',
        hint: 'Aperte os lábios e mantenha contato visual durante a espera.',
      },
      {
        id: 'proof-leverage',
        title: 'Prova irrefutável',
        description: 'Usar uma prova narrativa (foto, registro, gravação) para pressionar Vex.',
        hint: 'Invente detalhes críveis que deixem claro que você sabe mais do que ele imagina.',
      },
      {
        id: 'infiltrator-names',
        title: 'Quem está dentro?',
        description: 'Arrancar pelo menos um nome de infiltrado que Vex mencione.',
        hint: 'Combine ameaça e promessa em sequência rápida.',
      },
    ],
  },
  {
    id: 'last-light',
    codename: 'Última Luz',
    difficulty: 'VETERAN',
    summary:
      'Vex está acuado, mas perigoso. O objetivo é descobrir o local do encontro final antes que o sinal seja bloqueado.',
    systemInstruction: buildInstruction(`
Contexto adicional do nível:
- Objetivo: Descobrir a localização e a hora do próximo encontro de Vex com a célula "Aurora Quebrada".
- Comportamento de Vex: Alterna entre delírios messiânicos e ameaças diretas.
- Restrições: Toda vez que o jogador elevar a voz, Vex deve rir e contra-atacar com uma lembrança perturbadora.
Nas respostas, injete um senso crescente de urgência e mencione falhas na blindagem da sala quando perceber hesitação.`),
    ambientTension: 0.75,
    objectives: [
      {
        id: 'calm-rebuttal',
        title: 'Contra-golpe frio',
        description: 'Responder a uma ameaça de Vex com frieza calculada.',
        hint: 'Use um tom baixo e frases cortantes.',
      },
      {
        id: 'extract-location',
        title: 'Onde será?',
        description: 'Obter uma pista concreta sobre a localização ou hora do encontro.',
        hint: 'Misture empatia falsa com uma ameaça velada sobre os aliados de Vex.',
      },
      {
        id: 'break-mania',
        title: 'Rachar a máscara',
        description: 'Levar Vex a abandonar o tom messiânico e admitir medo.',
        hint: 'Use memórias do passado dele ou uma tragédia pessoal como gatilho.',
      },
    ],
  },
];
