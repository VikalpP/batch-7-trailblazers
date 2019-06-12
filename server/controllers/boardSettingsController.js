import Joi from '@hapi/joi';
import Board from '../models/boardModel';
import constants from '../config/constants';
import { buildResponse } from '../utils/helpers';

const getMembers = async function (req, res) {
  try {
    const validationSchema = Joi.object().keys({
      id: Joi.number().required(),
    });
    const { error } = Joi.validate({ id: req.params.id }, validationSchema);
    if (error) {
      const [{ message }] = error.details;
      const response = buildResponse(false, message);
      return res.status(400).send(response);
    }

    const boardId = req.params.id;
    const { members } = await Board.findOne({ id: boardId }, { members: 1 }).populate(
      'members.user',
      'name email',
    );

    return res.send(members);
  } catch (exception) {
    return res.status(500).send(buildResponse(false, `${exception}`));
  }
};

const updateMemberRole = async function (req, res) {
  try {
    const validationSchema = Joi.object().keys({
      id: Joi.number().required(),
      member: Joi.string().required(),
      role: Joi.string().required(),
    });
    const { error } = Joi.validate({ ...req.body, id: req.params.id }, validationSchema);
    if (error) {
      const [{ message }] = error.details;
      const response = buildResponse(false, message);
      return res.status(400).send(response);
    }

    const boardId = req.params.id;
    const newRole = req.body.role;
    const { member } = req.body;
    if (!constants.ROLES_ENUM[newRole]) {
      res.status(406).send(buildResponse(false, 'Role does not exist'));
    }
    const board = await Board.findOneAndUpdate(
      { id: boardId, 'members.user': member },
      {
        $set: {
          'members.$.role': newRole,
        },
      },
    );
    return res.send(buildResponse(true, 'Member role updated successfully'));
  } catch (exception) {
    return res.status(500).send(buildResponse(false, `${exception}`));
  }
};

const deleteMember = async function (req, res) {
  try {
    const validationSchema = Joi.object().keys({
      id: Joi.number().required(),
      member: Joi.string().required(),
    });
    const { error } = Joi.validate({ ...req.body, id: req.params.id }, validationSchema);
    if (error) {
      const [{ message }] = error.details;
      const response = buildResponse(false, message);
      return res.status(400).send(response);
    }

    // check login user is admin or superadmin - pending
    const boardId = req.params.id;
    const { member } = req.body;
    // update all issues related with member should be not assigned - pending
    const boards = await Board.findOne({
      id: boardId,
      'members.user': member,
      'members.role': { $ne: constants.ROLES_ENUM.SUPER_ADMIN },
    });
    if (!boards || boards.length === 0) {
      return res.status(400).send(buildResponse(false, 'Member not found or Member is superAdmin'));
    }
    await Board.findOneAndUpdate(
      { id: boardId, 'members.user': member },
      { $pull: { members: { user: member } } },
    );

    return res.send(buildResponse(true, 'Member deleted successfully'));
  } catch (exception) {
    return res.status(500).send(buildResponse(false, `${exception}`));
  }
};

export default { getMembers, updateMemberRole, deleteMember };