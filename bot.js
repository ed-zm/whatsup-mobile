const WebSocket = require('ws');

// ==========================================
// ⚙️ CONFIGURACIÓN DEL BOT (Reemplaza estos valores)
// ==========================================
const BOT_JWT = "AQUI_PEGAS_EL_JWT_DEL_USUARIO_B"; 
const BOT_USER_ID = "AQUI_EL_ID_DEL_USUARIO_B"; 
const WS_PORT = 3002; // El puerto de tu Realtime Gateway
const WS_URL = `ws://127.0.0.1:${WS_PORT}?token=${BOT_JWT}`;

// ==========================================
// 🚀 INICIALIZACIÓN DEL CLIENTE WEBSOCKET
// ==========================================
console.log("⏳ Iniciando el Cliente Fantasma (Bot)...");
const ws = new WebSocket(WS_URL);

ws.on('open', () => {
    console.log("🟢 Conectado y autenticado exitosamente en el servidor WebSocket.");
    console.log("🤖 Esperando mensajes entrantes...\n");
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data);
        
        // Evitar que el bot se responda a sí mismo si tu backend hace un "eco" de los mensajes enviados
        if (message.from === BOT_USER_ID) return;

        // Verificamos que sea un evento de mensaje de texto (ajusta el if según tu payload real)
        if (message.content) {
            console.log(`📥 [NUEVO MENSAJE] De: ${message.from}`);
            console.log(`   💬 "${message.content}"`);
            console.log(`   ⏳ Simulando escritura...`);

            // Simular un tiempo de respuesta humano (entre 2 y 3.5 segundos)
            const typingDelay = Math.floor(Math.random() * 1500) + 2000;

            setTimeout(() => {
                // Construir el payload de respuesta. 
                // Ajusta la estructura "action" y "data" según lo que espere tu backend.
                const replyPayload = {
                    action: "send_message",
                    data: {
                        to: message.from, 
                        content: `🤖 Bot: ¡Hola! Recibí tu mensaje: "${message.content}"`
                    }
                };

                ws.send(JSON.stringify(replyPayload));
                console.log(`   🚀 Respuesta enviada a ${message.from}.\n`);
            }, typingDelay);
        }

    } catch (error) {
        console.error("🔴 Error al procesar el payload entrante:", error.message);
    }
});

// Manejo de desconexiones y errores
ws.on('close', (code, reason) => {
    console.log(`🔴 Desconectado del servidor. Código: ${code}, Razón: ${reason || 'Ninguna'}`);
});

ws.on('error', (error) => {
    console.error("🔴 Error crítico en el WebSocket:", error.message);
    console.log("💡 Sugerencia: Verifica que el contenedor 'whatsup-realtime-gateway' esté corriendo y el JWT sea válido.");
});