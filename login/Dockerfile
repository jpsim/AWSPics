FROM lambci/lambda:build-nodejs12.x

# working folder
RUN mkdir /build
WORKDIR /build


# Copy the unzipped repository into the container
COPY ./htpasswd-auth /build/htpasswd-auth

# Navigate to the directory and install dependencies
WORKDIR /build/htpasswd-auth
RUN npm install

WORKDIR /build

# install dependencies (highly cacheable)
COPY package.json /build/package.json
RUN npm install --production

# add source code
COPY index.js /build/index.js

# zip entire context and stream output
RUN zip -r /build/dist.zip . > /dev/null
CMD ["cat", "/build/dist.zip"]
