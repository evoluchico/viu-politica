/* eslint-env node */

const colors = {
  transparent: "transparent",

  black: "#000000",
  "grey-90": "#0c0c0d",
  "grey-80": "#2a2a2e",
  "grey-70": "#38383d",
  "grey-60": "#4a4a4f",
  "grey-50": "#737373",
  grey: "#b1b1b3",
  "grey-40": "#b1b1b3",
  "grey-30": "#d7d7db",
  "grey-banner": "#f0f0f4",
  "grey-transparent": "hsla(250, 13%, 9%, .2)",
  "grey-20": "#ededf0",
  "grey-10": "#f9f9fa",
  white: "#ffffff",

  "red-90": "#3e0200",
  "red-80": "#5a0002",
  "red-70": "#a4000f",
  "red-60": "#d70022",
  red: "#EA0B12",
  "red-50": "#ff0039",
  // unspec
  "red-40": "#ff3363",
  "red-30": "#ff99aa",

  "orange-90": "#3e1300",
  "orange-80": "#712b00",
  "orange-70": "#a44900",
  "orange-60": "#d76e00",
  "orange-50": "#ff9400",
  // unspec
  "orange-40": "#ffb24c",
  "orange-30": "#ffd399",

  "yellow-90": "#3e2800",
  "yellow-80": "#715100",
  "yellow-70": "#a47f00",
  "yellow-60": "#d7b600",
  yellow: "#d7b600",
  "yellow-50": "#ffe900",
  "yellow-40": "#ffed4c",
  "yellow-30": "#fff599",

  "green-darkest": "#003706",
  "green-darker": "#006504",
  "green-dark": "#058b00",
  green: "#12bc00",
  "green-light": "#51d88a",
  "green-lighter": "#a2f5bf",
  "green-lightest": "#e3fcec",

  // 'teal-darkest': '#0d3331',
  // 'teal-darker': '#20504f',
  // 'teal-dark': '#38a89d',
  // teal: '#4dc0b5',
  // 'teal-light': '#64d5ca',
  // 'teal-lighter': '#a0f0ed',
  // 'teal-lightest': '#e8fffe',

  "blue-90": "#000f40",
  "blue-80": "#002275",
  "blue-70": "#003eaa",
  "blue-60": "#0060df",
  "blue-50": "#0a84ff",
  blue: "#0a84ff",
  "blue-40": "#45a1ff",
  "blue-30": "#99ccff",
  "blue-20": "#cce6ff",

  "ink-90": "#0f1126",
  "ink-80": "#202340",
  "ink-70": "#363959",

  // 'indigo-darkest': '#191e38',
  // 'indigo-darker': '#2f365f',
  // 'indigo-dark': '#5661b3',
  // indigo: '#6574cd',
  // 'indigo-light': '#7886d7',
  // 'indigo-lighter': '#b2b7ff',
  // 'indigo-lightest': '#e6e8ff',

  "purple-90": "#25003e",
  "purple-80": "#440071",
  "purple-70": "#6200a4",
  "purple-60": "#8000d7",
  "purple-50": "#9400ff",
  "purple-40": "#ad3bff",
  "purple-30": "#c069ff",
  "purple-20": "#d7a3ff",

  // 'pink-darkest': '#451225',
  // 'pink-darker': '#6f213f',
  // 'pink-dark': '#eb5286',
  // pink: '#f66d9b',
  // 'pink-light': '#fa7ea8',
  // 'pink-lighter': '#ffbbca',
  // 'pink-lightest': '#ffebef',
  cloud: "rgba(255, 255, 255, 0.8)",
  violet: "hsl(258, 57%, 35%)",
};

const sans = [
  "Nunito Sans",
  "Inter",
  "system-ui",
  "BlinkMacSystemFont",
  "-apple-system",
  "Segoe UI",
  "Roboto",
  "Oxygen",
  "Ubuntu",
  "Cantarell",
  "Fira Sans",
  "Droid Sans",
  "Helvetica Neue",
  "sans-serif",
];

module.exports = {
  theme: {
    colors,
    screens: {
      sm: "576px",
      md: "768px",
      lg: "992px",
      xl: "1200px",
      dark: { raw: "(prefers-color-scheme: dark)" },
    },
    fontFamily: {
      changa: ["Changa", ...sans],
      sans,
      serif: [
        "Zilla Slab",
        "Constantia",
        "Lucida Bright",
        "Lucidabright",
        "Lucida Serif",
        "Lucida",
        "DejaVu Serif",
        "Bitstream Vera Serif",
        "Liberation Serif",
        "Georgia",
        "serif",
      ],
      mono: [
        /*
        "Menlo",
        "Monaco",
        "Consolas",
        "Liberation Mono",
        "Courier New",
         */
        "monospace",
      ],
    },
    fontSize: {
      xxs: ".6875rem", // 11px
      xs: ".75rem", // 12px
      sm: ".875rem", // 14px
      m: ".9375rem", // 15px
      base: "1rem", // 16px
      lg: "1.125rem", // 18px
      xl: "1.25rem", // 20px
      "1.5xl": "1.375rem", // 22px
      "2xl": "1.5rem", // 24px
      "2.5xl": "1.75rem", // 28px
      "3xl": "2rem", // 32px
      "4xl": "2.25rem", // 36px
      "5xl": "3rem", // 48px
    },
    fontWeight: {
      hairline: 100,
      thin: 200,
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900,
    },
    lineHeight: {
      none: 1,
      tight: 1.25,
      normal: 1.5,
      loose: 1.75,
      "doorhanger-footer-button": 1.7,
    },
    letterSpacing: {
      tight: "-0.05em",
      normal: "0",
      wide: "0.05em",
    },
    textColor: colors,
    backgroundColor: colors,
    backgroundSize: {
      auto: "auto",
      cover: "cover",
      contain: "contain",
    },
    borderWidth: {
      default: "1px",
      "0": "0",
      "2": "2px",
      "4": "4px",
      "8": "8px",
    },
    borderColor: global.Object.assign({ default: colors["grey-30"] }, colors),
    borderRadius: {
      none: "0",
      sm: ".125rem",
      default: ".25rem",
      lg: ".5rem",
      xl: "1rem",
      full: "9999px",
    },
    width: {
      auto: "auto",
      px: "1px",
      "0": "0",
      "1": "0.25rem",
      "2": "0.5rem",
      "3": "0.75rem",
      "4": "1rem",
      "5": "1.25rem",
      "6": "1.5rem",
      "7": "1.75rem",
      "8": "2rem",
      "10": "2.5rem",
      "12": "3rem",
      "16": "4rem",
      "24": "6rem",
      "32": "8rem",
      "48": "12rem",
      "64": "16rem",
      "128": "32rem",
      "1/2": "50%",
      "1/3": "33.33333%",
      "2/3": "66.66667%",
      "1/4": "25%",
      "3/4": "75%",
      "1/5": "20%",
      "2/5": "40%",
      "3/5": "60%",
      "4/5": "80%",
      "1/6": "16.66667%",
      "5/6": "83.33333%",
      full: "100%",
      screen: "100vw",
    },
    height: {
      auto: "auto",
      px: "1px",
      "0": "0",
      "1": "0.25rem",
      "2": "0.5rem",
      "3": "0.75rem",
      "4": "1rem",
      "5": "1.25rem",
      "6": "1.5rem",
      "7": "1.75rem",
      "8": "2rem",
      "10": "2.5rem",
      "12": "3rem",
      "14": "3.5rem",
      "16": "4rem",
      "24": "6rem",
      "32": "8rem",
      "48": "12rem",
      "64": "16rem",
      full: "100%",
      screen: "100vh",
    },
    gap: {
      auto: "auto",
      px: "1px",
      "0": "0",
      "1": "0.25rem",
      "2": "0.5rem",
      "3": "0.75rem",
      "4": "1rem",
      "5": "1.25rem",
      "6": "1.5rem",
      "7": "1.75rem",
      "8": "2rem",
      "10": "2.5rem",
      "12": "3rem",
      "14": "3.5rem",
      "16": "4rem",
      "24": "6rem",
      "32": "8rem",
      "48": "12rem",
      "64": "16rem",
      full: "100%",
      screen: "100vh",
    },
    gridTemplateColumns: {
      "13": "repeat(13, minmax(0, 1fr))",
    },
    minWidth: {
      "0": "0",
      full: "100%",
    },
    minHeight: {
      "0": "0",
      full: "100%",
      screen: "100vh",
    },
    maxWidth: {
      xs: "20rem",
      sm: "30rem",
      md: "40rem",
      lg: "50rem",
      xl: "60rem",
      "2xl": "70rem",
      "3xl": "80rem",
      "4xl": "90rem",
      "5xl": "100rem",
      full: "100%",
    },
    maxHeight: {
      full: "100%",
      "half-screen": "50vh",
      screen: "100vh",
    },
    padding: {
      px: "1px",
      "0": "0",
      "1": "0.25rem",
      "2": "0.5rem",
      "3": "0.75rem",
      "4": "1rem",
      "5": "1.25rem",
      "6": "1.5rem",
      "7": "1.75rem",
      "8": "2rem",
      "10": "2.5rem",
      "12": "3rem",
      "16": "4rem",
      "20": "5rem",
      "24": "6rem",
      "32": "8rem",
    },
    margin: {
      auto: "auto",
      px: "1px",
      "0": "0",
      "0.88": "0.22rem",
      "1": "0.25rem",
      "2": "0.5rem",
      "3": "0.75rem",
      "4": "1rem",
      "4.5": "1.1rem",
      "5": "1.25rem",
      "6": "1.5rem",
      "8": "2rem",
      "10": "2.5rem",
      "12": "3rem",
      "16": "4rem",
      "20": "5rem",
      "24": "6rem",
      "32": "8rem",
      "-px": "-1px",
      "-1": "-0.25rem",
      "-2": "-0.5rem",
      "-3": "-0.75rem",
      "-4": "-1rem",
      "-5": "-1.25rem",
      "-6": "-1.5rem",
      "-8": "-2rem",
      "-10": "-2.5rem",
      "-12": "-3rem",
      "-16": "-4rem",
      "-20": "-5rem",
      "-24": "-6rem",
      "-32": "-8rem",
    },
    boxShadow: {
      default: "0 2px 4px 0 rgba(0,0,0,0.10)",
      md: "0 4px 8px 0 rgba(0,0,0,0.12), 0 2px 4px 0 rgba(0,0,0,0.08)",
      lg: "0 15px 30px 0 rgba(0,0,0,0.11), 0 5px 15px 0 rgba(0,0,0,0.08)",
      inner: "inset 0 2px 4px 0 rgba(0,0,0,0.06)",
      outline: "0 0 0 3px rgba(52,144,220,0.5)",
      none: "none",
      cloud: "0 0 5rem 5rem white",
      btn:
        "inset 0 -6px 12px 0 rgba(0,70,144,0.25), 0 4px 6px 0 rgba(34,0,51,0.04), 0 1px 10px 0 rgba(7,48,114,0.12), 0 2px 8px -1px rgba(14,13,26,0.08)",
    },
    opacity: {
      "0": "0",
      "25": ".25",
      "50": ".5",
      "75": ".75",
      "100": "1",
    },
    fill: {
      current: "currentColor",
    },
    stroke: {
      current: "currentColor",
    },

    zIndex: {
      auto: "auto",
      "0": 0,
      "10": 10,
      "20": 20,
      "30": 30,
      "40": 40,
      "50": 50,
    },
  },

  variants: {
    appearance: ["responsive"],
    backgroundAttachment: ["responsive"],
    backgroundColor: ["responsive", "hover", "focus"],
    backgroundPosition: ["responsive"],
    backgroundRepeat: ["responsive"],
    backgroundSize: ["responsive"],
    borderCollapse: [],
    borderColor: ["responsive", "hover", "focus"],
    borderRadius: ["responsive"],
    borderStyle: ["responsive"],
    borderWidth: ["responsive"],
    cursor: ["responsive"],
    display: ["responsive"],
    flexDirection: ["responsive"],
    flexWrap: ["responsive"],
    alignItems: ["responsive"],
    alignSelf: ["responsive"],
    alignContent: ["responsive"],
    justifyContent: ["responsive"],
    flex: ["responsive"],
    flexGrow: ["responsive"],
    flexShrink: ["responsive"],
    float: ["responsive"],
    fontFamily: ["responsive"],
    fontWeight: ["responsive", "hover", "focus"],
    height: ["responsive"],
    lineHeight: ["responsive"],
    listStylePosition: ["responsive"],
    listStyleType: ["responsive"],
    margin: ["responsive"],
    maxHeight: ["responsive"],
    maxWidth: ["responsive"],
    minHeight: ["responsive"],
    minWidth: ["responsive"],
    negativeMargin: ["responsive"],
    opacity: ["responsive", "hover"],
    outline: ["focus"],
    overflow: ["responsive"],
    padding: ["responsive"],
    pointerEvents: ["responsive"],
    position: ["responsive"],
    inset: ["responsive"],
    resize: ["responsive"],
    boxShadow: ["responsive", "hover", "focus"],
    fill: [],
    stroke: [],
    tableLayout: ["responsive"],
    textAlign: ["responsive"],
    textColor: ["responsive", "hover", "focus"],
    fontSize: ["responsive"],
    fontStyle: ["responsive", "hover", "focus"],
    fontSmoothing: ["responsive", "hover", "focus"],
    textDecoration: ["responsive", "hover", "focus"],
    textTransform: ["responsive", "hover", "focus"],
    letterSpacing: ["responsive"],
    userSelect: ["responsive"],
    verticalAlign: ["responsive"],
    visibility: ["responsive"],
    whitespace: ["responsive"],
    wordBreak: ["responsive"],
    width: ["responsive"],
    zIndex: ["responsive"],
  },
  corePlugins: {
    container: false,
  },
  plugins: [],
};
