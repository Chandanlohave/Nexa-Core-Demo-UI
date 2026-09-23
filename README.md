# NEXA AI Architecture Breakdown

## 1. Live Mode Logic (Real-time Communication)
**File:** `services/liveService.ts`

Live mode ka core logic `LiveSessionManager` class mein hai. Yeh Google Gemini Live API (WebSockets) use karta hai real-time audio streaming ke liye.

### Flow Mechanism:
1.  **Microphone Capture:** `AudioContext` aur `ScriptProcessorNode` ka use karke microphone se raw audio data (PCM format) capture kiya jata hai.
2.  **Streaming to API:** Yeh raw audio data chunks mein Gemini API ko bheja jata hai.
3.  **Receiving Audio:** API se response bhi audio chunks (Base64 PCM) mein aata hai.
4.  **Playback:** Is incoming audio ko decode karke `AudioBufferSourceNode` ke through play kiya jata hai.

### Audio Analysis (Important for HUD):
Hum ek `AnalyserNode` use karte hain output audio ke saath connect karne ke liye. Yeh analyzer humein real-time mein Frequency Data (Bass, Mid, Treble) aur Volume deta hai. Is data ko hum `audioRef` (ek reference object) mein store karte hain jo HUD component read karta hai.

```typescript
// services/liveService.ts
this.analysisInterval = window.setInterval(() => {
    this.outputAnalyser!.getByteFrequencyData(dataArray);
    // Calculate volume average
    let sum = 0; for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
    const vol = (sum / dataArray.length) / 128;
    
    // Callback to send data to App.tsx
    this.callbacks.onAudioData({ vol, bass: vol * 0.8, mid: vol, treble: vol * 0.6 });
}, 40);
```

## 2. HUD Visualizer (Canvas Animation)
**File:** `components/HUD.tsx`

Jo gol ghumne wala sphere (gola) dikhta hai, wo HTML5 `<canvas>` element hai.

### Working Principle:
1.  **Particles:** Yeh sphere lines nahi hai, balki hazaron chote dots (particles) hain. Har particle ka 3D coordinate (x, y, z) calculate hota hai.
2.  **Animation Loop:** `requestAnimationFrame` ka use karke browser har frame (approx 60 times per second) canvas ko clear karta hai aur dubara draw karta hai.
3.  **Audio Reactivity:** `App.tsx` se `audioRef` pass hota hai HUD mein. Jab audio (bass/volume) badhta hai, hum particles ka radius (center se duri) bada dete hain. Isse wo "bump" ya "beat" effect aata hai.

```typescript
// components/HUD.tsx - Animation Loop
const audioExpansion = bass * (baseRadius * 0.4); 
const targetR = baseRadius + globalExpansion + audioExpansion;

particlesRef.current.forEach((p, i) => {
    // Rotation logic...
    // Draw particle
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fill();
});
```

## 3. HUD Color Change Mechanism
**File:** `components/HUD.tsx` & `types.ts`

HUD ka color puri tarah se state prop par depend karta hai. `HUDState` ek Enum hai.

### Logic Flow:
1.  **States:** `IDLE`, `LISTENING`, `LIVE`, `WARNING`, `GLITCH`, etc.
2.  **Color Function:** `getThemeColors(state)` function current state ke hisaab se color return karta hai.

```typescript
const getThemeColors = (isDark: boolean) => {
  // 1. WARNING = RED
  if (state === HUDState.WARNING) return ['#FF0000', '#FF3333', '#800000']; 
  
  // 2. LIVE = GREEN
  if (state === HUDState.LIVE) return ['#00FF00', '#004400', '#CCFFCC'];
  
  // 3. GLITCH = RED/BLACK
  if (state === HUDState.GLITCH) return ['#8B0000', '#000000', '#FF0000'];

  // 4. Default = User Accent Color (e.g., Cyan)
  return [primary, secondary, tertiary];
};
```

## Pro Tip for Optimization
NEXA ke code mein `HUD.tsx` kaafi optimized hai. Wo `React.memo` use karta hai taaki unnecessary re-renders na hon, aur saara animation logic canvas ke andar directly JS se chalta hai, React state updates se nahi (performance ke liye).
