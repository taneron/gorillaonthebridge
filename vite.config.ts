import { defineConfig } from "vite";
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    server: {
        allowedHosts: ["fed0-178-112-86-74.ngrok-free.app", "gorillabridge.netlify.app"]
        // allowedHosts: true
    },
    plugins: [

        VitePWA({
            registerType: 'autoUpdate',
            devOptions: {
                enabled: true
            }
        })
    ],
    publicDir: "public"
})