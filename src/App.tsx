import { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";
import SplashScreen from "./screen/SplashScreen";
import LoginScreen from "./screen/LoginScreen";
import SignupScreen from "./screen/SignUpScreen";
import CameraScreen from "./screen/CameraScreen";
import Gallery from "./components/Gallery";
import FrameStudio from "./components/FrameStudio";
import type { Screen, MediaItem } from "./types";

const TWENTY_FOUR_H = 24 * 60 * 60 * 1000;

function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => {
    try {
      const saved = localStorage.getItem("remon_media");
      return saved ? (JSON.parse(saved) as MediaItem[]) : [];
    } catch {
      return [];
    }
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() =>
    Boolean(localStorage.getItem("remon_user")),
  );

  const itemsRef = useRef(mediaItems);
  useEffect(() => {
    itemsRef.current = mediaItems;
  }, [mediaItems]);

  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      const fresh = itemsRef.current.filter(
        (i) => now - (i.capturedAt ?? now) < TWENTY_FOUR_H,
      );
      if (fresh.length !== itemsRef.current.length) {
        setMediaItems(fresh);
        try {
          localStorage.setItem("remon_media", JSON.stringify(fresh));
        } catch {
          /* */
        }
      }
    };
    cleanup();
    const iv = setInterval(cleanup, 60_000);
    return () => clearInterval(iv);
  }, []);

  const saveMedia = useCallback((items: MediaItem[]) => {
    setMediaItems(items);
    try {
      localStorage.setItem("remon_media", JSON.stringify(items));
    } catch {
      /* */
    }
  }, []);

  const handleCapture = useCallback(
    (item: MediaItem) => saveMedia([item, ...itemsRef.current]),
    [saveMedia],
  );

  const handleDelete = useCallback(
    (ids: string | string[]) => {
      const rm = new Set(Array.isArray(ids) ? ids : [ids]);
      saveMedia(itemsRef.current.filter((i) => !rm.has(i.id)));
    },
    [saveMedia],
  );

  const requestCameraPermissionOnce = useCallback(async () => {
    if (localStorage.getItem("remon_cam_permission")) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      s.getTracks().forEach((t) => t.stop());
      localStorage.setItem("remon_cam_permission", "granted");
    } catch {
      localStorage.setItem("remon_cam_permission", "denied");
    }
  }, []);

  const handleLogin = useCallback(async () => {
    setIsLoggedIn(true);
    await requestCameraPermissionOnce();
    setScreen("camera");
  }, [requestCameraPermissionOnce]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("remon_user");
    setIsLoggedIn(false);
    setScreen("login");
  }, []);

  const navigateTo = useCallback((s: Screen) => setScreen(s), []);
  const handleSplashFinish = useCallback(() => {
    setScreen(isLoggedIn ? "camera" : "login");
  }, [isLoggedIn]);

  if (screen === "splash")
    return <SplashScreen onFinish={handleSplashFinish} />;

  if (screen === "login")
    return (
      <LoginScreen
        onLogin={() => {
          void handleLogin();
        }}
        onGoSignUp={() => setScreen("signup")}
      />
    );

  if (screen === "signup")
    return (
      <SignupScreen
        onSignUp={() => {
          void handleLogin();
        }}
        onGoLogin={() => setScreen("login")}
      />
    );

  if (screen === "camera")
    return (
      <CameraScreen
        onCapture={handleCapture}
        onNavigate={navigateTo}
        onLogout={handleLogout}
      />
    );

  if (screen === "gallery")
    return (
      <Gallery
        captures={mediaItems}
        onClose={() => setScreen("camera")}
        onDelete={handleDelete}
        onOpenFrameStudio={() => setScreen("frame-studio")}
      />
    );

  if (screen === "frame-studio")
    return (
      <FrameStudio captures={mediaItems} onClose={() => setScreen("gallery")} />
    );

  return null;
}

export default App;
