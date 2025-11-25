/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuração para compatibilidade com módulos ES
  transpilePackages: [],
  // Configuração experimental para excluir módulos problemáticos do bundling
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'textract', 'mammoth'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Marca pdf-parse como externo para evitar problemas com DOMMatrix
      config.externals = config.externals || []
      if (Array.isArray(config.externals)) {
        config.externals.push('pdf-parse', 'textract', 'mammoth')
      }
    }
    return config
  },
}

export default nextConfig
