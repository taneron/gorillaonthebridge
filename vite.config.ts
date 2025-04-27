import { defineConfig } from "vite";
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    server: {
        allowedHosts: ["a39d-178-112-86-74.ngrok-free.app"]
        // allowedHosts: true
    },
    plugins: [

        VitePWA({
            registerType: 'autoUpdate',
            devOptions: {
                enabled: true
            }
        })
    ]
})