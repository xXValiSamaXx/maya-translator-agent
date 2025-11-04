#!/bin/bash

# 🚀 Script de Inicio Rápido - Maya Translator Agent
# Este script configura todo automáticamente

set -e  # Exit on error

echo "════════════════════════════════════════════════════════"
echo "🌎 Maya Translator Agent - Setup Automático"
echo "════════════════════════════════════════════════════════"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# 1. Verificar Node.js
echo "🔍 Verificando Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado"
    print_info "Instala Node.js v22+ desde: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v)
print_success "Node.js encontrado: $NODE_VERSION"
echo ""

# 2. Verificar npm
echo "🔍 Verificando npm..."
if ! command -v npm &> /dev/null; then
    print_error "npm no está instalado"
    exit 1
fi

NPM_VERSION=$(npm -v)
print_success "npm encontrado: $NPM_VERSION"
echo ""

# 3. Instalar dependencias
echo "📦 Instalando dependencias..."
npm install
print_success "Dependencias instaladas"
echo ""

# 4. Verificar .env
echo "🔑 Configurando variables de entorno..."
if [ ! -f .env ]; then
    cp .env.example .env
    print_warning ".env creado desde .env.example"
    print_info "IMPORTANTE: Edita .env y agrega tu OPENAI_API_KEY"
    echo ""
    echo "Para obtener tu API key:"
    echo "1. Ve a https://platform.openai.com/api-keys"
    echo "2. Crea una nueva API key"
    echo "3. Cópiala y pégala en .env"
    echo ""
    
    # Preguntar si quiere agregar la key ahora
    read -p "¿Quieres agregar tu API key ahora? (s/n): " response
    if [[ "$response" =~ ^[Ss]$ ]]; then
        read -p "Pega tu OPENAI_API_KEY: " api_key
        echo "OPENAI_API_KEY=$api_key" > .env
        echo "PORT=3000" >> .env
        echo "NODE_ENV=development" >> .env
        print_success "API key configurada"
    else
        print_warning "No olvides configurar tu API key en .env antes de continuar"
    fi
else
    print_success ".env ya existe"
fi
echo ""

# 5. Verificar API key
if grep -q "your_openai_api_key_here" .env 2>/dev/null; then
    print_error "API key no configurada en .env"
    print_info "Edita .env y reemplaza 'your_openai_api_key_here' con tu API key real"
    exit 1
fi

# 6. Ejecutar tests
echo "🧪 Ejecutando tests..."
if node test.js; then
    print_success "Tests pasados exitosamente"
else
    print_error "Tests fallaron"
    print_info "Verifica tu API key en .env"
    exit 1
fi
echo ""

# 7. Opciones de siguiente paso
echo "════════════════════════════════════════════════════════"
echo "✨ Setup completado exitosamente"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Opciones:"
echo ""
echo "1️⃣  Iniciar servidor local:"
echo "   npm run dev"
echo ""
echo "2️⃣  Hacer deploy a Vercel:"
echo "   npm i -g vercel"
echo "   vercel login"
echo "   vercel --prod"
echo ""
echo "3️⃣  Ejecutar tests de nuevo:"
echo "   node test.js"
echo ""

# Preguntar qué quiere hacer
read -p "¿Qué quieres hacer? (1/2/3/salir): " choice

case $choice in
    1)
        print_info "Iniciando servidor en modo desarrollo..."
        npm run dev
        ;;
    2)
        print_info "Preparando deploy a Vercel..."
        
        # Verificar si Vercel está instalado
        if ! command -v vercel &> /dev/null; then
            print_warning "Vercel CLI no está instalado"
            read -p "¿Quieres instalarlo ahora? (s/n): " install_vercel
            if [[ "$install_vercel" =~ ^[Ss]$ ]]; then
                npm i -g vercel
                print_success "Vercel CLI instalado"
            else
                print_info "Instala Vercel CLI con: npm i -g vercel"
                exit 0
            fi
        fi
        
        print_info "Ejecutando 'vercel --prod'..."
        vercel --prod
        ;;
    3)
        print_info "Ejecutando tests..."
        node test.js
        ;;
    *)
        print_info "Setup completado. Ejecuta 'npm run dev' cuando estés listo."
        ;;
esac

echo ""
print_success "¡Todo listo! 🎉"
