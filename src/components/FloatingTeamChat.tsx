'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, X, Send, Sparkles, 
  Trash2, CheckCheck, ChevronDown, Bell, Zap
} from 'lucide-react';
import Swal from 'sweetalert2';
import { TeamUser } from '@/lib/teamAuth';
import { 
  getTeamChatMessages, sendTeamChatMessage, clearTeamChatHistory, ChatMessageRecord 
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
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);
  const [isBuzzing, setIsBuzzing] = useState(false);
  const [buzzSender, setBuzzSender] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Efecto de sonido (Zumbido / Notificación suave sin archivos externos)
  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Primer tono (zumbido armónico alegre)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.1); // G5
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Segundo tono sutil
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12); // A5
      gain2.gain.setValueAtTime(0.15, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.38);
    } catch {
      // Ignorar si el navegador bloquea audio antes de interacción
    }
  };

  // Disparar animación de zumbido y vibración háptica
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

  // Cargar mensajes iniciales y polling cada 5 segundos
  useEffect(() => {
    loadMessages();
    const interval = setInterval(() => {
      loadMessages();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
      if (messages.length > 0) {
        setLastSeenId(messages[messages.length - 1].id);
      }
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
        // Detectar si llegaron mensajes nuevos de otra persona para activar el zumbido
        if (!isFirstLoadRef.current) {
          const newExternalMsgs = incomingList.filter(
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

        // Registrar IDs conocidos
        incomingList.forEach((m) => knownMessageIdsRef.current.add(m.id));
        isFirstLoadRef.current = false;
        setMessages(incomingList);
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
      role: 'Supervisión Seguridad Industrial',
      shortName: 'Tatiana',
      color: 'indigo'
    };

    const text = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    const tempMsg: ChatMessageRecord = {
      id: `local-${Date.now()}`,
      sender_name: sender.name,
      sender_role: sender.role,
      message: text,
      created_at: new Date().toISOString()
    };

    knownMessageIdsRef.current.add(tempMsg.id);
    const updated = [...messages, tempMsg];
    setMessages(updated);
    scrollToBottom();

    try {
      const res = await sendTeamChatMessage(sender.name, sender.role, text);
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

  const handleClearHistory = () => {
    Swal.fire({
      title: '¿Limpiar historial de chat?',
      text: 'Se eliminarán los mensajes de la conversación para todo el equipo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, vaciar historial',
      cancelButtonText: 'Cancelar'
    }).then(async (res) => {
      if (res.isConfirmed) {
        setMessages([]);
        knownMessageIdsRef.current.clear();
        localStorage.removeItem(LOCAL_FALLBACK_KEY);

        try {
          await clearTeamChatHistory();
        } catch (err) {
          console.warn('Error al vaciar en Supabase:', err);
        }

        Swal.fire({
          icon: 'success',
          title: 'Historial Limpiado',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
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
        bg: 'bg-indigo-600',
        text: 'text-white',
        border: 'border-indigo-700',
        bubble: 'bg-indigo-600 text-white',
        tag: 'bg-indigo-100 text-indigo-800'
      };
    }
    if (name.includes('Gabriela')) {
      return {
        bg: 'bg-emerald-600',
        text: 'text-white',
        border: 'border-emerald-700',
        bubble: 'bg-emerald-600 text-white',
        tag: 'bg-emerald-100 text-emerald-800'
      };
    }
    if (name.includes('Paola')) {
      return {
        bg: 'bg-amber-600',
        text: 'text-white',
        border: 'border-amber-700',
        bubble: 'bg-amber-600 text-white',
        tag: 'bg-amber-100 text-amber-800'
      };
    }
    return {
      bg: 'bg-slate-700',
      text: 'text-white',
      border: 'border-slate-800',
      bubble: 'bg-slate-700 text-white',
      tag: 'bg-slate-100 text-slate-800'
    };
  };

  const quickMessages = [
    '¡Aviso publicado en el cronograma! 📌',
    'Recepción de agua completada 💧',
    'Revisión de extintores terminada ✅',
    '¿Me ayudas con una revisión? 🤝'
  ];

  return (
    <>
      {/* ESTILOS DE ANIMACIÓN DE ZUMBIDO */}
      <style jsx global>{`
        @keyframes team-buzz-shake {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          15% { transform: translate(-5px, -3px) rotate(-3deg) scale(1.05); }
          30% { transform: translate(5px, 3px) rotate(3deg) scale(1.05); }
          45% { transform: translate(-4px, 2px) rotate(-2deg) scale(1.03); }
          60% { transform: translate(4px, -2px) rotate(2deg) scale(1.03); }
          75% { transform: translate(-2px, 1px) rotate(-1deg) scale(1.01); }
          90% { transform: translate(2px, -1px) rotate(1deg) scale(1.01); }
        }
        .team-buzz-active {
          animation: team-buzz-shake 0.8s cubic-bezier(0.36, 0.07, 0.19, 0.97) both !important;
          box-shadow: 0 0 25px rgba(245, 158, 11, 0.6) !important;
        }
      `}</style>

      <div className="fixed bottom-5 right-5 z-50 font-sans print:hidden">
        {/* VENTANA DEL CHAT */}
        {isOpen ? (
          <div className={`w-[360px] sm:w-[410px] h-[550px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200 ${
            isBuzzing ? 'team-buzz-active ring-4 ring-amber-400' : ''
          }`}>
            
            {/* HEADER DEL CHAT */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white p-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-sm shadow-inner border border-white/20">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full animate-pulse"></span>
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight flex items-center gap-1.5">
                    Mensajería Interna
                    {isBuzzing && (
                      <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 animate-bounce">
                        <Zap className="w-3 h-3" /> Zumbido
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-purple-200 font-medium truncate max-w-[200px]">
                    Tatiana • Gabriela • Paola
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* BOTÓN LIMPIAR HISTORIAL */}
                <button
                  type="button"
                  onClick={handleClearHistory}
                  disabled={messages.length === 0}
                  className="p-1.5 rounded-xl text-slate-300 hover:text-rose-300 hover:bg-rose-950/40 disabled:opacity-30 transition cursor-pointer"
                  title="Limpiar historial de chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* BOTÓN PROBAR ZUMBIDO */}
                <button
                  type="button"
                  onClick={() => triggerBuzz(currentUser?.name)}
                  className="p-1.5 rounded-xl text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 transition cursor-pointer"
                  title="Enviar zumbido al equipo"
                >
                  <Zap className="w-4 h-4" />
                </button>

                {/* BOTÓN MINIMIZAR */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="Minimizar chat"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* AVISO DE ZUMBIDO / MENSAJE NUEVO */}
            {buzzSender && (
              <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-black flex items-center justify-between animate-in fade-in duration-150">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 animate-bounce" />
                  ¡Nuevo mensaje recibido de {buzzSender}!
                </span>
              </div>
            )}

            {/* PERFIL ACTIVO BANNER */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-slate-500">Conectada como:</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  currentUser?.color === 'indigo' ? 'bg-indigo-500' :
                  currentUser?.color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}></span>
                <span className="font-extrabold text-slate-800 text-[11px]">
                  {currentUser?.name || 'Tatiana Torres'}
                </span>
              </div>
            </div>

            {/* AREA DE MENSAJES */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6 text-indigo-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-600">Espacio de comunicación directo</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[240px]">
                    Escribe un mensaje para coordinar actividades con Tatiana, Gabriela y Paola.
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
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colors.tag}`}>
                            {msg.sender_name}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {formatMessageTime(msg.created_at)}
                          </span>
                        </div>
                      )}

                      <div
                        className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
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

            {/* MENSAJES RÁPIDOS */}
            <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar">
              {quickMessages.map((quick, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputMessage(quick)}
                  className="text-[10px] font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200 rounded-lg px-2.5 py-1 whitespace-nowrap transition cursor-pointer"
                >
                  {quick}
                </button>
              ))}
            </div>

            {/* CAJA DE ENTRADA */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                placeholder="Escribe un mensaje para el equipo..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                autoFocus
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || sending}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-md transition transform active:scale-95 cursor-pointer"
                title="Enviar mensaje (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>
        ) : (
          /* BURBUJA FLOTANTE CUANDO ESTA CERRADO */
          <button
            onClick={() => setIsOpen(true)}
            className={`group relative flex items-center gap-2.5 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-500 text-white px-4 py-3 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 border-2 border-white/20 cursor-pointer ${
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
                {isBuzzing ? '¡Zumbido de Chat!' : 'Chat de Equipo'}
              </p>
              <p className="text-[10px] text-purple-200 font-medium">Tatiana • Gabriela • Paola</p>
            </div>

            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse shadow-md">
                {unreadCount}
              </span>
            )}
          </button>
        )}
      </div>
    </>
  );
}
