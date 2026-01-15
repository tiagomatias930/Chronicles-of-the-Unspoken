
export type Language = 'pt' | 'en';

export const translations = {
  pt: {
    gameTitle: "Chronicles of the Unspoken",
    tagline: "LINK NEURAL ATIVO // DETETIVE 49-X",
    btnStart: "INICIALIZAR LINK NEURAL",
    decrypting: "DESCRIPTOGRAFANDO_DADOS...",
    missionSelect: "SELEÇÃO DE MISSÃO",
    intelReport: "RELATÓRIO DE INTELIGÊNCIA",
    toggleVR: "MODO VR",
    aboutText: "Bem-vindo, Detetive. Chronicles of the Unspoken é uma experiência de RPG tático movida por IA. O sistema utiliza sua câmera e microfone para processar suas ações em tempo real. Você não apenas joga, você interage. Fale com os suspeitos, mostre evidências para a lente e quebre firewalls com movimentos biométricos. O sucesso da Agência depende da sua capacidade de persuasão e observação.",
    missions: {
      interrogation: { name: "O Interrogador", desc: "Extração Psicológica", briefing: "O informante 'Vex' foi capturado. Ele sabe onde o mercado negro opera. Sua missão é extrair essa localização usando qualquer meio psicológico necessário. Aproxime-se da câmera para intimidar ou use lógica fria." },
      cyber: { name: "Protocolo Ghost", desc: "Invasão Digital", briefing: "Você está diante do terminal central da Agência. A IA de defesa GHOST exige identificação biométrica e padrões de movimento humano. Siga as instruções visuais para quebrar o firewall." },
      forensics: { name: "Oráculo Digital", desc: "Varredura de Evidências", briefing: "Disco rígido corrompido recuperado. O sistema ORACLE precisa de ajuda visual para reconstruir os fragmentos. Mostre as evidências físicas para reduzir a corrupção." },
      market: { name: "Mercado Negro", desc: "Avaliação de Ativos", briefing: "Neo-Berlin Market. Você precisa de 500 créditos. Mostre itens valiosos para o receptor 'Zero' avaliar via scanner óptico." },
      defusal: { name: "Unidade de Crise", desc: "Desarmamento de Bomba", briefing: "CRÍTICO: Dispositivo explosivo ativado. O robô UNIT-7 está em pânico. Siga as ordens visuais de desarmamento imediatamente." }
    },
    hud: {
      uplink: "Neural_Uplink",
      detetive: "Detetive_49-X-LEVIATHAN",
      stress: "Estresse do Suspeito",
      resistance: "Resistência",
      reading: "LEITURA_L:",
      integrity: "Integridade do Firewall",
      corruption: "Corrupção de Dados",
      evidence: "Evidências_Encontradas",
      credits: "Créditos Neurais",
      target: "Objetivo: 500 CR",
      stability: "Estabilidade",
      danger: "PERIGO",
      connecting: "CONECTANDO...",
      establishLink: "ESTABELECER LINK NEURAL",
      caseResolved: "CASO RESOLVIDO",
      victoryDesc: "O informante Vex cedeu. A localização do mercado negro foi enviada para o HQ. Excelente trabalho, Detetive.",
      btnClose: "FECHAR CASO",
      btnNext: "PRÓXIMA MISSÃO"
    }
  },
  en: {
    gameTitle: "Chronicles of the Unspoken",
    tagline: "NEURAL LINK ACTIVE // DETECTIVE 49-X",
    btnStart: "INITIALIZE NEURAL LINK",
    decrypting: "DECRYPTING_BIO_INTEL...",
    missionSelect: "MISSION SELECT",
    intelReport: "INTELLIGENCE REPORT",
    toggleVR: "VR MODE",
    aboutText: "Welcome, Detective. Chronicles of the Unspoken is an AI-driven tactical RPG experience. The system uses your camera and microphone to process your actions in real-time. You don't just play; you interact. Talk to suspects, show evidence to the lens, and breach firewalls with biometric movements. The Agency's success depends on your persuasion and observation skills.",
    missions: {
      interrogation: { name: "The Interrogator", desc: "Psychological Extract", briefing: "The informant 'Vex' has been captured. He knows where the black market operates. Your mission is to extract this location using any necessary psychological means. Approach the camera to intimidate or use cold logic." },
      cyber: { name: "Ghost Protocol", desc: "Digital Breach", briefing: "You are before the Agency's central terminal. The GHOST defense AI requires biometric identification and human movement patterns. Follow visual cues to breach the firewall." },
      forensics: { name: "Digital Oracle", desc: "Evidence Scan", briefing: "Corrupted hard drive recovered. The ORACLE system needs visual help to reconstruct the fragments. Show physical evidence to reduce data corruption." },
      market: { name: "Black Market", desc: "Asset Valuation", briefing: "Neo-Berlin Market. You need 500 credits. Show valuable items to the 'Zero' fence to evaluate via optical scanner." },
      defusal: { name: "Crisis Unit", desc: "Bomb Defusal", briefing: "CRITICAL: Explosive device activated. The UNIT-7 robot is panicking. Follow visual defusal orders immediately." }
    },
    hud: {
      uplink: "Neural_Uplink",
      detetive: "Detective_49-X-LEVIATHAN",
      stress: "Suspect Stress",
      resistance: "Resistance",
      reading: "L_READING:",
      integrity: "Firewall Integrity",
      corruption: "Data Corruption",
      evidence: "Evidence_Logs",
      credits: "Neural Credits",
      target: "Target: 500 CR",
      stability: "Stability",
      danger: "DANGER",
      connecting: "CONNECTING...",
      establishLink: "ESTABLISH NEURAL LINK",
      caseResolved: "CASE RESOLVED",
      victoryDesc: "Vex gave in. The black market location has been sent to HQ. Excellent work, Detective.",
      btnClose: "CLOSE CASE",
      btnNext: "NEXT MISSION"
    }
  }
};
