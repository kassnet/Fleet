# Dockerfile pour le frontend React
FROM node:18-alpine

WORKDIR /app

# Copier les fichiers package.json
COPY package*.json ./
COPY yarn.lock ./

# Installer les dépendances
RUN yarn install

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 3000

# Commande par défaut
CMD ["yarn", "start"]