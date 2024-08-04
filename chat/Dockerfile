# Use the official Node.js image.
FROM node:21.1.0

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
COPY package*.json ./

# Install dependencies.
RUN npm install

# Install nodemon globally
RUN npm install -g nodemon

# Copy local code to the container image.
COPY . .

# Run the web service on container startup.
CMD ["npm", "run", "server"]

# Expose the port the app runs on
EXPOSE 5000
