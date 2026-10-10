import { z } from "zod";

// Mensajes por defecto de Zod en español (cliente y servidor). Los mensajes
// propios de cada schema tienen prioridad sobre estos.
z.config(z.locales.es());
