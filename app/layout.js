import './globals.css'

export const metadata = {
  title: 'DigitaLab — Treino de Digitação',
  description: 'Treine velocidade, precisão e técnica de digitação em português.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}