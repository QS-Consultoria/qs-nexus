/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurações de produção
  poweredByHeader: false,
  compress: true,
  
  // Variáveis de ambiente públicas
  env: {
    NEXT_PUBLIC_APP_NAME: 'QS Nexus',
    NEXT_PUBLIC_APP_VERSION: '2.0.0',
  },
  
  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    serverComponentsExternalPackages: ['drizzle-orm', 'postgres', '@langchain/core', '@langchain/openai', '@langchain/google-genai'],
  },
}

export default nextConfig
