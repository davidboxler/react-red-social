// Importar modulos
const fs = require('fs')
const path = require('path')

// Importar modelos
const Publication = require("../models/publication")

// Importar servicios
const followService = require("../services/followService")

// Acciones de prueba
const pruebaPublication = (req, res) => {
    return res.status(200).send({
        message: "Mensaje enviado desde: controllers/publication.js"
    })
}

// Guardar una publicacion
const save = (req, res) => {
    // Recoger datos del body
    const params = req.body

    // Si no me llega dar respuesta negativa
    if (!params.text) return res.status(400).send({ status: "error", message: "Debes enviar el testo de la publicacion" })

    // Crear y rellenar el objeto del modelo
    let newPublication = new Publication(params)
    newPublication.user = req.user.id

    // Guardar objeto en la bbdd
    newPublication.save((error, publicationStored) => {
        if (error || !publicationStored) return res.status(400).send({ status: "error", message: "No se ha guardado la publicacion" })

        return res.status(200).send({
            status: "success",
            message: "Guardar publicacion",
            publicationStored
        })
    })
}

// Sacar una publicacion
const detail = (req, res) => {
    // Sacar id de la publicacion de la url
    const publicacionId = req.params.id

    // Find con la condicion del id
    Publication.findById(publicacionId, (error, publicationStored) => {

        if (error || !publicationStored) {
            return res.status(404).send({
                status: "error",
                message: "No existe la publicacion"
            })
        }

        // Devolver respuesta
        return res.status(200).send({
            status: "error",
            message: "Mostrar publicacion",
            publication: publicationStored
        })
    })
}

// Eliminar publicacion
const remove = (req, res) => {
    // Sacar el id de la publicacion 
    const publicationId = req.params.id

    // Find y luego un remove
    Publication.find({ "user": req.user.id, "_id": publicationId }).remove(error => {
        if (error) {
            return res.status(500).send({
                status: "error",
                message: "No se ha eliminado la publicacion"
            })
        }

        // Devolver respuesta
        return res.status(200).send({
            status: "error",
            message: "Eliminar publicacion",
            publication: publicationId
        })
    })
}

// Listar publicaciones de un usuario
const user = (req, res) => {
    // Sacar el id de usuario
    const userId = req.params.id

    // Controlar la pagina
    let page = 1

    if (req.params.page) page = req.params.page

    const itemPerPage = 1

    // Find, populate, ordenar y paginar 
    Publication.find({ "user": userId })
        .sort("-created_at")
        .populate('user', '-password -__v -role -email')
        .paginate(page, itemPerPage, (error, publications, total) => {

            if (error || !publications || publications.length <= 0) {
                return res.status(404).send({
                    status: "error",
                    message: "No hay publicaciones para mostrar",
                })
            }

            // Devolver respuesta
            return res.status(200).send({
                status: "success",
                message: "Publicaciones del perfil de un usuario",
                page,
                total,
                pages: Math.ceil(total / itemPerPage),
                publications
            })

        })
}

// Subir archivos
const upload = (req, res) => {
    // Sacar el id de la publicacion
    const publicationId = req.params.id

    // Rocoger el fichero de imagen y comprobar que existe
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
    Publication.findOneAndUpdate({ "user": req.user.id, "_id": publicationId }, { image: req.file.filename }, { new: true }, (error, publicationUpdated) => {
        if (error || !publicationUpdated) {
            return res.status(500).send({
                status: "error",
                message: "Error al subir el avatar"
            })
        }

        // Devolver respuesta negativa
        return res.status(200).send({
            status: "success",
            publication: publicationUpdated,
            file: req.file
        })
    })
}

// Imagen del avatar del usuario
const media = (req, res) => {
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

// Listar todas las publicaciones (FEED)
const feed = async (req, res) => {
    // Sacar pagina actual
    let page = 1

    if (req.params.page) {
        page = req.params.page
    }

    // Establecer numero de elementos por pagina
    let itemsPerPage = 5

    // Sacar un array de identificadores de usuarios que yo sigo como usuario
    try {
        const myFollows = await followService.followUserIds(req.user.id)

        // Find a publicaciones in, ordenar, popular, paginar
        const publications = await Publication.find({ user: myFollows.following })
            .populate("user", "password -role -__v -email")
            .sort("-created_at")
            .paginate(page, itemsPerPage, (error, publications, total) => {

                if(error || !publications){
                    return res.status(500).send({
                        status: "error",
                        message: "No hay publicaciones para mostrar"
                    })
                }

                return res.status(200).send({
                    status: "success",
                    message: "Feed de publicaciones",
                    following: myFollows.following,
                    total,
                    page,
                    pages: Math.ceil(total / itemsPerPage),
                    publications
                })
            })
    } catch (error) {
        return res.status(500).send({
            status: "error",
            message: "Error al obtener usuarios que sigues"
        })
    }
}

// Exportar acciones
module.exports = {
    pruebaPublication,
    save,
    detail,
    remove,
    user,
    upload,
    media,
    feed
}