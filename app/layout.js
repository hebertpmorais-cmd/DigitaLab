import './globals.css'

export const metadata = {
  title: 'RatoTurbo — Treino de Digitação',
  description: 'Digite rápido, aumente sua precisão e acompanhe seu rastro de evolução no RatoTurbo.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}