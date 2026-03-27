# ── Build stage ───────────────────────────────────────────────────────────
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install production dependencies only (keeps image small)
RUN npm install --omit=dev

# Copy the rest of the application files
COPY . .

# Expose the API port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
