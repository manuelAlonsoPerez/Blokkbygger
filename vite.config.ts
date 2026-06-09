import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  if (mode === "library") {
    return {
      plugins: [react()],
      build: {
        lib: {
          entry: resolve(__dirname, "src/index.ts"),
          name: "Blokkbygger",
          formats: ["es", "umd"],
          fileName: (format) => `blokkbygger.${format}.js`,
        },
        rollupOptions: {
          external: ["react", "react-dom", "react/jsx-runtime"],
          output: {
            globals: {
              react: "React",
              "react-dom": "ReactDOM",
              "react/jsx-runtime": "ReactJSXRuntime",
            },
          },
        },
        cssCodeSplit: false,
      },
    };
  }

  return {
    plugins: [react()],
    root: ".",
  };
});
