import Joi from 'joi';

const participantsSchema = Joi.object({
    name: Joi.string()
        .required()
})

const postBodySchema = Joi.object({
    to: Joi.string()
        .required(),

    text: Joi.string()
        .required(),

    type: Joi.string()
        .valid('private_message' ,"message")
        .insensitive()
        .required()
})

const userSchema = Joi.object({
    user: Joi.string().required()
})


export { participantsSchema, postBodySchema, userSchema }
