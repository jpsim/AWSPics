FROM lambci/lambda:build-nodejs12.x

# working folder
RUN mkdir /build
WORKDIR /build

# install dependencies (highly cacheable)
COPY package.json /build/package.json
RUN npm install --production

# add source code
COPY index.js /build/index.js
COPY lib /build/lib

# add HTML templates
COPY homepage /build/homepage
COPY album /build/album
COPY shared /build/shared

# zip entire context and stream output
RUN zip -r /build/dist.zip . > /dev/null
CMD ["cat", "/build/dist.zip"]
