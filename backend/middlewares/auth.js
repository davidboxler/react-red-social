// Importar dependencias
const jwt = require("jwt-simple")
const moment = require("moment")

// Importar clave secreta
const libjwt = require("../services/jwt")
const secret = libjwt.secret

// Funcion de autenticacion 
const auth = (req, res, next) => {

    // Comprobar si me llega la cabecera de auth
    if (!req.headers.authorization) {
        return res.status(400).json({
            status: "Error",
            message: "La peticion no tiene la cabecera de autenticación"
        })
    }

    // Limpiar el token
    let token = req.headers.authorization.replace(/['"]+/g, '')

    // Decodificar token
    try {
        let payload = jwt.decode(token, secret)

        // Comprobar expiracion del token
        if (payload.exp <= moment().unix()) {
            return res.status(401).send({
                status: "Error",
                message: "Token expirado"
            })
        }

        // Agregar datos de usuario a request
        req.user = payload

    } catch(error){
        return res.status(404).send({
            status: "Error",
            message: "Token invalido",
            error
        })
    }

    next()
}

module.exports = { auth }