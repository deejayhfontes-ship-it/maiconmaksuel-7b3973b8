import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'sans-serif'
        ],
      },
      fontSize: {
        // iOS Typography Scale
        'display': ['34px', { lineHeight: '1.2', letterSpacing: '-0.5px', fontWeight: '700' }],
        'headline': ['28px', { lineHeight: '1.3', letterSpacing: '-0.3px', fontWeight: '600' }],
        'title-1': ['22px', { lineHeight: '1.4', letterSpacing: '-0.2px', fontWeight: '600' }],
        'title-2': ['17px', { lineHeight: '1.4', letterSpacing: '-0.1px', fontWeight: '600' }],
        'body': ['15px', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],
        'callout': ['13px', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '400' }],
        'caption': ['11px', { lineHeight: '1.3', letterSpacing: '0.1px', fontWeight: '400' }],
      },
      spacing: {
        // iOS Spacing System (base 4px)
        'ios-xs': '4px',
        'ios-sm': '8px',
        'ios-md': '12px',
        'ios-lg': '16px',
        'ios-xl': '24px',
        'ios-2xl': '32px',
        'ios-3xl': '48px',
        'ios-4xl': '64px',
        '18': '4.5rem',
        '88': '22rem',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        tertiary: "hsl(var(--tertiary))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          bg: "hsl(var(--destructive-bg))",
          text: "hsl(var(--destructive-text))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          bg: "hsl(var(--success-bg))",
          text: "hsl(var(--success-text))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          bg: "hsl(var(--warning-bg))",
          text: "hsl(var(--warning-text))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          bg: "hsl(var(--info-bg))",
          text: "hsl(var(--info-text))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        'ios-xs': '6px',
        'ios-sm': '8px',
        'ios-md': '10px',
        'ios-lg': '12px',
        'ios-xl': '16px',
        'ios-2xl': '20px',
        'ios-full': '9999px',
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        'ios-xs': 'var(--shadow-xs)',
        'ios-sm': 'var(--shadow-sm)',
        'ios-md': 'var(--shadow-md)',
        'ios-lg': 'var(--shadow-lg)',
        'ios-xl': 'var(--shadow-xl)',
        'ios-primary': 'var(--shadow-primary)',
        'ios-success': 'var(--shadow-success)',
        'ios-destructive': 'var(--shadow-destructive)',
        'card': 'var(--shadow-sm)',
        'card-hover': 'var(--shadow-lg)',
        'elevated': 'var(--shadow-xl)',
      },
      transitionTimingFunction: {
        'ios': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ios-smooth': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'ios-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      transitionDuration: {
        'ultra-fast': '100ms',
        'fast': '200ms',
        'normal': '300ms',
        'slow': '500ms',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(8px)" },
        },
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "scale-out": {
          from: { transform: "scale(1)", opacity: "1" },
          to: { transform: "scale(0.95)", opacity: "0" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out-right": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(100%)" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out-left": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-100%)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          from: { transform: "translateY(0)", opacity: "1" },
          to: { transform: "translateY(100%)", opacity: "0" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "shimmer": {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "ios-modal-enter": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "ios-modal-exit": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.95)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-ios",
        "accordion-up": "accordion-up 0.2s ease-ios",
        "fade-in": "fade-in 0.3s ease-ios forwards",
        "fade-out": "fade-out 0.3s ease-ios forwards",
        "scale-in": "scale-in 0.2s ease-ios",
        "scale-out": "scale-out 0.2s ease-ios",
        "slide-in-right": "slide-in-right 0.3s ease-ios",
        "slide-out-right": "slide-out-right 0.3s ease-ios",
        "slide-in-left": "slide-in-left 0.3s ease-ios",
        "slide-out-left": "slide-out-left 0.3s ease-ios",
        "slide-up": "slide-up 0.3s ease-ios",
        "slide-down": "slide-down 0.3s ease-ios",
        "enter": "fade-in 0.3s ease-ios, scale-in 0.2s ease-ios",
        "exit": "fade-out 0.3s ease-ios, scale-out 0.2s ease-ios",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "spin-slow": "spin-slow 3s linear infinite",
        "bounce-subtle": "bounce-subtle 1s ease-in-out infinite",
        "ios-modal-enter": "ios-modal-enter 0.3s ease-ios",
        "ios-modal-exit": "ios-modal-exit 0.3s ease-ios",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
