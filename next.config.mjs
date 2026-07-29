/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Padrão do Next.js é 1MB — baixo demais pra foto de banner/produto
    // em alta resolução. Bate nesse limite fácil (foto de celular
    // moderno passa de 1MB rotineiramente). 10MB dá bastante margem.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
