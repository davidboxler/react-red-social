// Importar dependencias
const bcrypt = require("bcrypt")
const mongoosePagination = require("mongoose-pagination")
const fs = require('fs')
const path = require('path')

// Importar modelos
const User = require("../models/user")
const Follow = require("../models/follow");
const Publication = require("../models/publication");

// Importar Servicios
const jwt = require("../services/jwt")
const followingServices = require("../services/followService")
const validate = require("../helpers/validate")

// Acciones de prueba
const pruebaUser = (req, res) => {
    return res.status(200).send({
        message: "Mensaje enviado desde: controllers/user.js",
        usuario: req.user
    })
}

// Registro de usuarios
const register = (req, res) => {
    // Recoger datos de la peticion
    let params = req.body

    // Comprobar que me llegan bien (+ validacion)
    if (!params.name || !params.email || !params.password || !params.nick) {
        return res.status(400).json({
            status: "Error",
            message: "Faltan datos por enviar"
        })
    }

    // Validación avanzada
    try{
        validate(params)   
    } catch(error) {
        return res.status(400).json({
            status: "Error",
            message: "Validación no superada"
        })
    }
   
    // Control usuarios duplicados
    User.find({
        $or: [
            { email: params.email.toLowerCase() },
            { nick: params.nick.toLowerCase() }

        ]
    }).exec(async (error, users) => {
        if (error) return res.status(500).json({ status: "error", message: "Error en la consulta de usuarios" })

        if (users && users.length >= 1) {
            return res.status(200).send({
                status: "success",
                message: "El usuario ya existe"
            })
        }

        // Cifrar la contraseña
        let pwd = await bcrypt.hash(params.password, 10)
        params.password = pwd

        // Crear objeto de usuario
        let user_to_save = new User(params)

        // Guardar usuario en la bbdd
        user_to_save.save((error, userStored) => {
            if (error || !userStored) return res.status(500).send({ status: "error", message: "Error al guardar el usuario" })

            // Devolver resultado
            return res.status(200).json({
                status: "success",
                message: "Usuario registrado correctamente",
                user: userStored
            })
        })
    })
}

// Login de usuarios
const login = (req, res) => {
    // Recoger parametros body
    let params = req.body

    if (!params.email || !params.password) {
        return res.status(400).send({
            status: "error",
            message: "Faltan datos por enviar"
        })
    }

    // Buscar si existe en la bbdd 
    User.findOne({ email: params.email })
        // .select({ "password": 0 })
        .exec((error, user) => {

            if (error || !user) return res.status(404).send({ status: "error", message: "El usuario no existe" })

            // Comprobar su contraseña
            const pwd = bcrypt.compareSync(params.password, user.password)

            if (!pwd) {
                return res.status(400).send({
                    status: "error",
                    message: "No te has identificado correctamente"
                })
            }

            // Conseguir token 
            const token = jwt.createToken(user)

            return res.status(200).json({
                status: "success",
                message: "Te has identificado correctamente",
                user: {
                    id: user._id,
                    name: user.name,
                    nick: user.nick
                },
                token
            })
        })
}

// Perfil de usuarios
const profile = (req, res) => {
    // Recibir el parametro del id de usuario por la url
    const id = req.params.id

    // Consulta para sacar los datos del usuario
    // const userProfile = await User.findById(id)

    User.findById(id)
        .select({ password: 0, role: 0 })
        .exec(async (error, userProfile) => {
            if (error || !userProfile) {
                return res.status(404).send({ status: "error", message: "El usuario no existe" })
            }

            const followInfo = await followingServices.followThisUser(req.user.id, id)
            // Devolver el resultado
            return res.status(200).send({
                status: "success",
                user: userProfile,
                following: followInfo.following,
                follower: followInfo.follower
            })
        })
}

// Lista de usuarios
const list = (req, res) => {
    // Controlar en que pagina estamos
    let page = 1
    if (req.params.page) {
        page = req.params.page
    }
    page = parseInt(page)

    // Consulta con mongoose paginate
    let itemsPerPage = 5

    User.find().select("-password -email -role -__v").sort('_id').paginate(page, itemsPerPage, async (error, users, total) => {
        if (error || !users) {
            return res.status(404).send({ status: "error", message: "No hay usuarios disponibles", error })
        }

        const followUserIds = await followingServices.followUserIds(req.user.id)

        // Devolver el resultado (posteriormente info follow)
        return res.status(200).send({
            status: "success",
            users,
            page,
            itemsPerPage,
            total,
            pages: Math.ceil(total / itemsPerPage),
            user_following: followUserIds.following,
            user_followers: followUserIds.followers
        })
    })
}

// Actualizar usuarios
const update = (req, res) => {
    // Recoger info del usuario actualizar
    let userIdentity = req.user
    let userToUpdated = req.body

    // Eliminar campos sobrantes
    delete userToUpdated.iat
    delete userToUpdated.exp
    delete userToUpdated.role
    delete userToUpdated.image

    // Comprobar si el usuario ya existe
    User.find({
        $or: [
            { email: userToUpdated.email.toLowerCase() },
            { nick: userToUpdated.nick.toLowerCase() }

        ]
    }).exec(async (error, users) => {
        if (error) return res.status(500).json({ status: "error", message: "Error en la consulta de usuarios" })

        let userIsset = false
        users.forEach(user => {
            if (user && user._id != userIdentity.id) userIsset = true
        })

        if (userIsset) {
            return res.status(200).send({ status: "success", message: "El usuario ya existe" })
        }

        // Cifrar la contraseña
        if (userToUpdated.password) {
            let pwd = await bcrypt.hash(userToUpdated.password, 10)
            userToUpdated.password = pwd
        } else {
            delete userToUpdated.password
        }

        // Buscar y actualizar
        try {
            let userUpdated = await User.findByIdAndUpdate({ _id: userIdentity.id }, userToUpdated, { new: true })

            if (!userUpdated) {
                return res.status(400).json({ status: "success", message: "Error al actulizar" })
            }

            // Devolver respuesta
            return res.status(200).send({ status: "success", message: "Actualizar usuario", user: userUpdated })

        } catch (error) {
            return res.status(500).send({ status: "success", message: "Error" })
        }
    })
}

// Subir archivos
const upload = (req, res) => {

    if (!req.file) {
        return res.status(404).send({
            status: "success",
            message: "Peticion no incluye imagen"
        })
    }

    // Conseguir el nombre del archivo
    let image = req.file.originalname

    // Sacar la extension del archivo
    const imageSplit = image.split("\.")
    const extension = imageSplit[1]

    // Comprobar extension
    if (extension != 'png' && extension != 'jpg' && extension != 'jpeg' && extension != 'gif') {

        // Borrar archivo subido
        const filePath = req.file.path
        const fileDeleted = fs.unlinkSync(filePath)

        // Devolver respuesta negativa
        return res.status(400).send({
            status: "success",
            message: "Extension de archivo invalida"
        })
    }

    // Si es correcto guardar la imagen
    User.findOneAndUpdate({ _id: req.user.id }, { image: req.file.filename }, { new: true }, (error, userUpdated) => {
        if (error || !userUpdated) {
            return res.status(500).send({
                status: "error",
                message: "Error al subir el avatar"
            })
        }

        // Devolver respuesta negativa
        return res.status(200).send({
            status: "success",
            user: userUpdated,
            file: req.file
        })
    })
}

// Imagen del avatar del usuario
const avatar = (req, res) => {
    // Sacar el parametro de la url
    const file = req.params.file

    // Montar el path real de la imagen
    const filePath = "./uploads/avatars/" + file

    // Comprobar que existe
    fs.stat(filePath, (error, exists) => {
        if (!exists)
            return res.status(404).send({
                status: "error",
                message: "No existe la imagen"
            })

        // Devolver un file
        return res.sendFile(path.resolve(filePath))
    })
}

const counters = async (req, res) => {

    let userId = req.user.id;

    if (req.params.id) {
        userId = req.params.id;
    }

    try {
        const following = await Follow.count({ "user": userId });

        const followed = await Follow.count({ "followed": userId });

        const publications = await Publication.count({ "user": userId });

        return res.status(200).send({
            userId,
            following: following,
            followed: followed,
            publications: publications
        });
    } catch (error) {
        return res.status(500).send({
            status: "error",
            message: "Error en los contadores",
            error
        });
    }
}

// Exportar acciones
module.exports = { pruebaUser, register, login, profile, list, update, upload, avatar, counters }