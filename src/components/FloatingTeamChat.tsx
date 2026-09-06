'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, Send, Sparkles, 
  Trash2, CheckCheck, ChevronDown, Zap
} from 'lucide-react';
import { TeamUser } from '@/lib/teamAuth';
import { 
  getTeamChatMessages, sendTeamChatMessage, ChatMessageRecord 
} from '@/app/actions/teamCollab';

interface FloatingTeamChatProps {
  currentUser: TeamUser | null;
}

const LOCAL_FALLBACK_KEY = 'safety_team_chat_fallback_v1';

export default function FloatingTeamChat({ currentUser }: FloatingTeamChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isBuzzing, setIsBuzzing] = useState(false);
  const [buzzSender, setBuzzSender] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  const getPersonalClearKey = () => {
    const userIdentifier = currentUser?.shortName || currentUser?.name || 'default';
    return `chat_cleared_at_${userIdentifier.toLowerCase().trim()}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Sonido suave de zumbido/notificación sin librerías externas
  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Doble tono armónico suave
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(523.25, now);
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.1);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.26);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.28);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.1);
      gain2.gain.setValueAtTime(0.15, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.35);
    } catch {
      // Ignorar si el navegador restringe audio previo a interacción
    }
  };

  // Activar zumbido con animación y vibración háptica
  const triggerBuzz = (senderName?: string) => {
    setIsBuzzing(true);
    if (senderName) setBuzzSender(senderName);
    playNotificationSound();

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate?.([80, 50, 80]);
      } catch {}
    }

    setTimeout(() => {
      setIsBuzzing(false);
      setBuzzSender(null);
    }, 1200);
  };

  // Polling regular cada 5 segundos
  useEffect(() => {
    loadMessages();
    const interval = setInterval(() => {
      loadMessages();
    }, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
    }
  }, [isOpen, messages]);

  const loadMessages = async () => {
    try {
      const res = await getTeamChatMessages(80);
      let incomingList: ChatMessageRecord[] = [];

      if (res.success && res.data) {
        incomingList = res.data;
      } else {
        const local = localStorage.getItem(LOCAL_FALLBACK_KEY);
        if (local) incomingList = JSON.parse(local);
      }

      if (incomingList.length > 0) {
        // Obtener el límite de tiempo de borrado personal de este usuario
        const clearKey = getPersonalClearKey();
        const personalClearedAt = localStorage.getItem(clearKey);
        const cutoff = personalClearedAt ? new Date(personalClearedAt).getTime() : 0;

        // Filtrar mensajes que correspondan después de que ella limpió su historial
        const visibleList = incomingList.filter(
          (m) => new Date(m.created_at).getTime() > cutoff
        );

        // Detectar si llegaron mensajes nuevos de otra persona para activar el zumbido
        if (!isFirstLoadRef.current) {
          const newExternalMsgs = visibleList.filter(
            (m) => !knownMessageIdsRef.current.has(m.id) && m.sender_name !== currentUser?.name
          );

          if (newExternalMsgs.length > 0) {
            const latest = newExternalMsgs[newExternalMsgs.length - 1];
            triggerBuzz(latest.sender_name);

            if (!isOpen) {
              setUnreadCount((prev) => prev + newExternalMsgs.length);
            }
          }
        }

        visibleList.forEach((m) => knownMessageIdsRef.current.add(m.id));
        isFirstLoadRef.current = false;
        setMessages(visibleList);
      }
    } catch (err) {
      console.warn('Fallback en carga de chat:', err);
      const local = localStorage.getItem(LOCAL_FALLBACK_KEY);
      if (local) setMessages(JSON.parse(local));
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const sender = currentUser || {
      name: 'Tatiana Torres',
      role: 'Seguridad Industrial',
      shortName: 'Tatiana',
      color: 'indigo'
    };

    const text = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    const tempMsg: ChatMessageRecord = {
      id: `local-${Date.now()}`,
      sender_name: sender.name,
      sender_role: sender.role || 'ENDE DEORURO',
      message: text,
      created_at: new Date().toISOString()
    };

    knownMessageIdsRef.current.add(tempMsg.id);
    const updated = [...messages, tempMsg];
    setMessages(updated);
    scrollToBottom();

    try {
      const res = await sendTeamChatMessage(sender.name, sender.role || 'ENDE DEORURO', text);
      if (res.success && res.data) {
        knownMessageIdsRef.current.add(res.data.id);
        setMessages((prev) => prev.map((m) => (m.id === tempMsg.id ? res.data! : m)));
      } else {
        localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(updated));
      }
    } catch {
      localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(updated));
    } finally {
      setSending(false);
    }
  };

  // Limpieza individual instantánea: solo para ella, sin confirmaciones ni ventanas emergentes
  const handleClearPersonalHistory = () => {
    const clearKey = getPersonalClearKey();
    localStorage.setItem(clearKey, new Date().toISOString());
    setMessages([]);
    knownMessageIdsRef.current.clear();
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getSenderColor = (name: string) => {
    if (name.includes('Tatiana')) {
      return {
        bg: 'bg-rose-600',
        bubble: 'bg-gradient-to-r from-rose-500 to-rose-600 text-white',
        tag: 'bg-rose-100 text-rose-800 border border-rose-200'
      };
    }
    if (name.includes('Paola')) {
      return {
        bg: 'bg-sky-600',
        bubble: 'bg-gradient-to-r from-sky-500 to-sky-600 text-white',
        tag: 'bg-sky-100 text-sky-800 border border-sky-200'
      };
    }
    if (name.includes('Gabriela')) {
      return {
        bg: 'bg-orange-600',
        bubble: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white',
        tag: 'bg-orange-100 text-orange-900 border border-orange-200'
      };
    }
    return {
      bg: 'bg-amber-600',
      bubble: 'bg-amber-600 text-white',
      tag: 'bg-amber-100 text-amber-800 border border-amber-200'
    };
  };

  return (
    <>
      {/* ANIMACIÓN DE ZUMBIDO */}
      <style jsx global>{`
        @keyframes team-buzz-shake {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          15% { transform: translate(-4px, -2px) rotate(-2deg) scale(1.03); }
          30% { transform: translate(4px, 2px) rotate(2deg) scale(1.03); }
          45% { transform: translate(-3px, 2px) rotate(-1.5deg) scale(1.02); }
          60% { transform: translate(3px, -2px) rotate(1.5deg) scale(1.02); }
          75% { transform: translate(-2px, 1px) rotate(-1deg) scale(1.01); }
          90% { transform: translate(2px, -1px) rotate(1deg) scale(1.01); }
        }
        .team-buzz-active {
          animation: team-buzz-shake 0.8s cubic-bezier(0.36, 0.07, 0.19, 0.97) both !important;
          box-shadow: 0 0 25px rgba(245, 158, 11, 0.6) !important;
        }
      `}</style>

      {/* CONTENEDOR GENERAL */}
      <div className="fixed z-50 font-sans print:hidden">
        {/* VENTANA DEL CHAT */}
        {isOpen ? (
          <div className={`fixed inset-x-2 bottom-2 sm:inset-auto sm:bottom-5 sm:right-5 w-auto sm:w-[410px] h-[86dvh] sm:h-[560px] max-h-[92vh] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200 ${
            isBuzzing ? 'team-buzz-active ring-4 ring-amber-400' : ''
          }`}>
            
            {/* HEADER DEL CHAT */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white p-3.5 sm:p-4 flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-sm shadow-inner border border-white/20">
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full animate-pulse"></span>
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-black tracking-tight flex items-center gap-1.5 truncate">
                    Mensajería Interna
                    {isBuzzing && (
                      <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 animate-bounce">
                        <Zap className="w-2.5 h-2.5" /> Zumbido
                      </span>
                    )}
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-purple-200 font-medium truncate">
                    Tatiana • Gabriela • Paola
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* BOTÓN LIMPIAR HISTORIAL PERSONAL (INSTANTÁNEO) */}
                <button
                  type="button"
                  onClick={handleClearPersonalHistory}
                  className="p-2 sm:p-1.5 rounded-xl text-slate-300 hover:text-rose-300 hover:bg-rose-950/40 transition cursor-pointer"
                  title="Limpiar mi pantalla de chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* BOTÓN ZUMBIDO */}
                <button
                  type="button"
                  onClick={() => triggerBuzz(currentUser?.name)}
                  className="p-2 sm:p-1.5 rounded-xl text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 transition cursor-pointer"
                  title="Enviar zumbido"
                >
                  <Zap className="w-4 h-4" />
                </button>

                {/* BOTÓN MINIMIZAR */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 sm:p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="Minimizar"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* AVISO DE ZUMBIDO */}
            {buzzSender && (
              <div className="bg-amber-500 text-slate-950 px-3 py-1 text-[11px] font-black flex items-center justify-between shrink-0 animate-in fade-in">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 animate-bounce" />
                  ¡Nuevo mensaje de {buzzSender}!
                </span>
              </div>
            )}

            {/* PERFIL ACTIVO BANNER */}
            <div className="bg-slate-50 border-b border-slate-200 px-3.5 py-1.5 sm:py-2 flex items-center justify-between text-xs shrink-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500">Conectada:</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  currentUser?.color === 'rose' ? 'bg-rose-500' :
                  currentUser?.color === 'sky' ? 'bg-sky-500' :
                  currentUser?.color === 'orange' ? 'bg-orange-500' : 'bg-amber-500'
                } animate-pulse`}></span>
                <span className="font-extrabold text-slate-800 text-[11px]">
                  {currentUser?.name || 'Tatiana Torres'}
                </span>
              </div>
            </div>

            {/* AREA DE MENSAJES */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 bg-slate-50/50 overscroll-contain">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-2 sm:mb-3">
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-600">Bandeja de chat limpia</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[240px]">
                    Escribe un mensaje para iniciar la conversación con Tatiana, Gabriela y Paola.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = currentUser 
                    ? msg.sender_name.includes(currentUser.shortName) || msg.sender_name === currentUser.name
                    : msg.sender_name.includes('Tatiana');

                  const colors = getSenderColor(msg.sender_name);

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                    >
                      {!isMe && (
                        <div className="flex items-center gap-1.5 px-1">
                          <span className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colors.tag}`}>
                            {msg.sender_name}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {formatMessageTime(msg.created_at)}
                          </span>
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] sm:max-w-[80%] px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                          isMe
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-xs'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      </div>

                      {isMe && (
                        <div className="flex items-center gap-1 px-1">
                          <span className="text-[9px] text-slate-400 font-mono">
                            {formatMessageTime(msg.created_at)}
                          </span>
                          <CheckCheck className="w-3 h-3 text-indigo-500" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* CAJA DE ENTRADA (OPTIMIZADA PARA MÓVIL) */}
            <form onSubmit={handleSendMessage} className="p-2.5 sm:p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
              <input
                type="text"
                placeholder="Escribe un mensaje..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 sm:py-2 text-sm sm:text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || sending}
                className="p-3 sm:p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-md transition transform active:scale-95 cursor-pointer shrink-0"
                title="Enviar mensaje (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>
        ) : (
          /* BURBUJA FLOTANTE CUANDO ESTÁ CERRADO */
          <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5">
            <button
              onClick={() => setIsOpen(true)}
              className={`group relative flex items-center gap-2 sm:gap-2.5 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-500 text-white px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 border-2 border-white/20 cursor-pointer ${
                isBuzzing ? 'team-buzz-active ring-4 ring-amber-400 bg-amber-600' : ''
              }`}
            >
              <div className="relative">
                {isBuzzing ? (
                  <Zap className="w-5 h-5 text-amber-300 animate-spin" />
                ) : (
                  <MessageCircle className="w-5 h-5 text-white animate-bounce-subtle" />
                )}
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-slate-900"></span>
              </div>
              
              <div className="text-left">
                <p className="text-xs font-black tracking-tight leading-none">
                  {isBuzzing ? '¡Zumbido!' : 'Chat de Equipo'}
                </p>
                <p className="text-[9px] sm:text-[10px] text-purple-200 font-medium">Tatiana • Gabriela • Paola</p>
              </div>

              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse shadow-md">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
