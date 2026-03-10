/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                telegram: {
                    blue: '#24A1DE',
                    dark: '#1c1c1c',
                    card: '#242424',
                }
            }
        },
    },
    plugins: [],
}
