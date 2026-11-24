# Architecture

`game` is an independent Vite entrypoint. Phaser owns the canvas and scene lifecycle; HTML/CSS owns the title, selection, question, and results screens. React is not imported into the game.

The existing `apps/web` platform is unchanged. The game can be launched as a standalone app now and later linked or embedded by the platform. `src/services/api` owns all future platform communication, while `src/types` defines stable domain contracts. No backend or fake authentication is included.
