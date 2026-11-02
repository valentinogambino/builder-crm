import { defineConfig } from "vite-plus";
import path from "node:path";

export default defineConfig({
  /**
   * Tests del nucleo. Corren sin base de datos, sin red y sin servidor: son los
   * invariantes que, si se rompen, **no avisan**. Un contacto que se ve de mas, un
   * webhook falso que entra, un mensaje que WhatsApp descarta en silencio.
   *
   * Lo que necesita base o navegador no vive aca: eso lo cubre
   * `scripts/verificar-instancia.mjs` contra la instancia desplegada.
   */
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
      "@config": path.resolve(process.cwd(), "config"),
      "@modules": path.resolve(process.cwd(), "modules"),
      "server-only": path.resolve(process.cwd(), "tests/server-only-vacio.ts"),
    },
  },
  fmt: {
    singleQuote: false,
    printWidth: 100,
    sortPackageJson: false,
    ignorePatterns: [".next/**", "out/**", "build/**", "next-env.d.ts", "package-lock.json", "**/*.md", "**/*.generated.ts"],
  },
  lint: {
    plugins: ["oxc", "typescript", "unicorn", "nextjs", "react"],
    // Solo las reglas listadas abajo (las que activaba eslint-config-next), sin la
    // categoria `correctness` entera de Oxlint, para no cambiar el alcance del lint.
    categories: {
      correctness: "off",
    },
    env: {
      builtin: true,
    },
    ignorePatterns: [".next/**", "out/**", "build/**", "next-env.d.ts"],
    rules: {
      "no-array-constructor": "error",
      "no-unused-expressions": "error",
      // Igual que @typescript-eslint/no-unused-vars de next/typescript: warn y sin ignorar
      // los nombres con `_` (Oxlint los ignora por defecto).
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^$", varsIgnorePattern: "^$", caughtErrorsIgnorePattern: "^$" },
      ],
      "nextjs/no-sync-scripts": "error",
      "nextjs/inline-script-id": "error",
      "nextjs/no-assign-module-variable": "error",
      "nextjs/no-document-import-in-page": "error",
      "nextjs/no-duplicate-head": "error",
      "nextjs/no-head-import-in-document": "error",
      "nextjs/no-script-component-in-head": "error",
      "typescript/ban-ts-comment": "error",
      "typescript/no-duplicate-enum-values": "error",
      "typescript/no-empty-object-type": "error",
      "typescript/no-explicit-any": "error",
      "typescript/no-extra-non-null-assertion": "error",
      "typescript/no-misused-new": "error",
      "typescript/no-namespace": "error",
      "typescript/no-non-null-asserted-optional-chain": "error",
      "typescript/no-require-imports": "error",
      "typescript/no-this-alias": "error",
      "typescript/no-unnecessary-type-constraint": "error",
      "typescript/no-unsafe-declaration-merging": "error",
      "typescript/no-unsafe-function-type": "error",
      "typescript/no-wrapper-object-types": "error",
      "typescript/prefer-as-const": "error",
      "typescript/prefer-namespace-keyword": "error",
      "typescript/triple-slash-reference": "error",
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    overrides: [
      {
        files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
        rules: {
          "react/display-name": "error",
          "react/jsx-key": "error",
          "react/jsx-no-comment-textnodes": "error",
          "react/jsx-no-duplicate-props": "error",
          "react/jsx-no-target-blank": "off",
          "react/jsx-no-undef": "error",
          "react/no-children-prop": "error",
          "react/no-danger-with-children": "error",
          "react/no-direct-mutation-state": "error",
          "react/no-find-dom-node": "error",
          "react/no-is-mounted": "error",
          "react/no-render-return-value": "error",
          "react/no-string-refs": "error",
          "react/no-unescaped-entities": "error",
          "react/no-unknown-property": "off",
          "react/no-unsafe": "off",
          "react/react-in-jsx-scope": "off",
          "react/require-render-return": "error",
          "import/no-anonymous-default-export": "warn",
          "jsx-a11y/alt-text": [
            "warn",
            {
              elements: ["img"],
              img: ["Image"],
            },
          ],
          "jsx-a11y/aria-props": "warn",
          "jsx-a11y/aria-proptypes": "warn",
          "jsx-a11y/aria-unsupported-elements": "warn",
          "jsx-a11y/role-has-required-aria-props": "warn",
          "jsx-a11y/role-supports-aria-props": "warn",
          "nextjs/google-font-display": "warn",
          "nextjs/google-font-preconnect": "warn",
          "nextjs/next-script-for-ga": "warn",
          "nextjs/no-async-client-component": "warn",
          "nextjs/no-before-interactive-script-outside-document": "warn",
          "nextjs/no-css-tags": "warn",
          "nextjs/no-head-element": "warn",
          // Apagada: la version de ESLint solo mira `pages/`, que este proyecto (App Router)
          // no tiene, asi que nunca reportaba. La de Oxlint reporta todo <a href="/...">.
          "nextjs/no-html-link-for-pages": "off",
          "nextjs/no-img-element": "warn",
          "nextjs/no-page-custom-font": "warn",
          "nextjs/no-styled-jsx-in-document": "warn",
          "nextjs/no-sync-scripts": "warn",
          "nextjs/no-title-in-document-head": "warn",
          "nextjs/no-typos": "warn",
          "nextjs/no-unwanted-polyfillio": "warn",
          "react/rules-of-hooks": "error",
          "react/exhaustive-deps": "warn",
          "react/static-components": "error",
          "react/use-memo": "error",
          "react/preserve-manual-memoization": "error",
          "react/incompatible-library": "warn",
          "react/immutability": "error",
          "react/globals": "error",
          "react/refs": "error",
          // DEUDA CONOCIDA, a proposito y con fecha. La regla llego activa al actualizar a
          // eslint-config-next 16.4.3 (en 16.2.2 no estaba) y marca 9 sitios que ya existian:
          // componentes que cargan datos con `useEffect(() => { load() }, [load])` donde
          // `load` toca el estado antes del primer `await`. Provoca renders en cascada al
          // montar; no es un fallo de correccion ni de seguridad.
          //
          // Queda en `warn` y no en `error` porque arreglarlo bien es reestructurar la carga
          // de datos de nueve componentes y eso no entra en una version de seguridad: cada
          // uno necesita que alguien recorra la pantalla y compruebe los estados de carga.
          // Sigue saliendo en cada `npm run lint` para que no se olvide.
          //
          // Los nueve: app/plantillas/page.tsx, contacts/OwnerSelect, conversations/
          // ContactDetailPanel, conversations/TemplatePicker, pipeline/KanbanBoard,
          // pipeline/PipelineEditor, settings/AgentSettings, settings/ChannelsSettings,
          // lib/use-push.
          "react/set-state-in-effect": "warn",
          "react/error-boundaries": "error",
          // warn y no error: la version de Oxlint da falsos positivos (`useState(new Date())`
          // y `new Date()` dentro de un handler async) que la de ESLint no reportaba.
          "react/purity": "warn",
          "react/set-state-in-render": "error",
          "react/unsupported-syntax": "warn",
        },
        plugins: ["import", "jsx-a11y"],
        env: {
          browser: true,
          node: true,
        },
      },
      {
        files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
        rules: {
          "constructor-super": "off",
          "getter-return": "off",
          "no-class-assign": "off",
          "no-const-assign": "off",
          "no-dupe-class-members": "off",
          "no-dupe-keys": "off",
          "no-func-assign": "off",
          "no-import-assign": "off",
          "no-new-native-nonconstructor": "off",
          "no-obj-calls": "off",
          "no-redeclare": "off",
          "no-setter-return": "off",
          "no-this-before-super": "off",
          "no-undef": "off",
          "no-unreachable": "off",
          "no-unsafe-negation": "off",
          "no-var": "error",
          "no-with": "off",
          "prefer-const": "error",
          "prefer-rest-params": "error",
          "prefer-spread": "error",
        },
      },
    ],
    options: {
      // TS 5 en el proyecto: tsgolint pide TS 7. El typecheck sigue en `npm run typecheck`.
      typeAware: false,
      typeCheck: false,
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
  },
});
