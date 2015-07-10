var http = require("http")
    , shoe = require("shoe")
    , path = require("path")
    , watch = require("watch")
    , bundle = require("browserify-server")
    , openStreams = []

module.exports = LiveReloadServer

function LiveReloadServer(options) {
    var server = http.createServer(serveText)
        , sock = shoe(handleStream)
        , paths = options._ || process.cwd()
        , filterIgnored = options.ignore || noop
        , delay = options.delay || 1000
        , port = options.port || 9090
        , timer
        , source = bundle(path.join(__dirname, "reload.js"), {
            body: "require('./browser.js')(" + port + ")"
        })

    paths.forEach(function (path) {
        watch.watchTree(path, {
            ignoreDotFiles: true
        }, function (fileName, curr, prev) {
            if (typeof fileName == "object" && prev === null && curr === null) {
                // Finished walking the tree
            } else {
                reload(fileName)
            }
        })
    })

    sock.install(server, "/shoe")

    server.listen(port)

    console.log("live reload server listening on port", port
        , "reloading on files")


    function serveText(req, res) {
        res.setHeader("content-type", "application/javascript")
        res.end(source)
    }

    function handleStream(stream) {
        openStreams.push(stream)

        stream.on("end", remove)

        function remove() {
            var index = openStreams.indexOf(stream)
            if (index !== -1) {
                openStreams.splice(index, 1)
            }
        }
    }

    function reload(fileName) {
        if (timer) {
            clearTimeout(timer)
        }

        timer = setTimeout(function () {
            if (!filterIgnored(fileName)) {
                openStreams.forEach(sendMessage)
            }
        }, delay)
    }

    function sendMessage(stream) {
        stream && stream.write("reload")
    }
}

function noop() {}
