<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Chronicles of the Unspoken - AI-Powered Detective Game

An immersive interactive detective game powered by Google's Gemini Live API. Interact with AI characters using voice and video to solve crimes, interrogate suspects, and defuse bombs!

## 🎮 How to Play

### **Levels Overview:**

1. **🔴 INTERROGATION (Level 1: VEX)**
   - Interrogate a dangerous informant
   - Use your voice to detect psychological cues
   - Break their resistance to reveal the Black Market location
   - Success: Get resistance to 0%

2. **💻 CYBER BREACH (Level 2: GHOST)**
   - Hack into a paranoid AI security system
   - Prove your humanity through hand/face recognition
   - Break through firewall integrity
   - Success: Get firewall to 0%

3. **🔍 FORENSICS (Level 3: ORACLE)**
   - Analyze corrupted hard drive data
   - Use specific voice commands: "INICIAR VARREDURA", "AMPLIAR SETOR X"
   - Find digital signatures of bomb manufacturers
   - Success: Recover all evidence (corruption to 0%)

4. **💰 BLACK MARKET (Level 4: ZERO)**
   - Show items to camera for appraisal
   - Trade with a cynical cyberpunk merchant
   - Collect 500 credits
   - Success: Gather enough credits

5. **💣 BOMB DEFUSAL (Level 5: UNIT-7)**
   - Defuse a virtual bomb using camera input
   - Follow UNIT-7's instructions carefully
   - Cut the correct wires in AR visualization
   - Success: Defuse the bomb without explosion

## 🚀 Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `VITE_GEMINI_API_KEY` in [.env.local](.env.local):
   ```
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3001](http://localhost:3001) in your browser

5. **Allow camera and microphone permissions** when prompted

## 🎮 Controls

- **INITIALIZE LINK**: Start the level when connected
- **PAUSE (Menu)**: Pause the game at any time
- **CONTINUE**: Resume the game
- **NEW GAME**: Start over
- **MAIN MENU**: Return to main menu

## 🔧 Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 📋 Game Features

✅ Real-time voice and video processing  
✅ AI-powered character responses  
✅ Dynamic difficulty based on player performance  
✅ Persistent game save (localStorage)  
✅ Multi-level campaign structure  
✅ AR bomb defusal gameplay  
✅ Cyberpunk aesthetic with neon UI  

## 🤖 Technology Stack

- **Frontend**: React + TypeScript
- **AI**: Google Gemini Live API
- **Build**: Vite
- **Styling**: Tailwind CSS
- **Audio**: Web Audio API
- **Video**: WebRTC

## ⚠️ Notes

- Game requires **stable internet** for Gemini Live API
- **Camera and microphone permissions** are mandatory
- Best played in a **quiet environment** for voice recognition
- Tested on Chrome/Firefox/Edge (recommended)

## 📝 License

MIT

---

**Detective Leviathan, the case awaits you in the shadows of Neo-Berlin...**
