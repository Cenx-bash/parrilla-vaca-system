const express = require('express');
const router = express.Router();
const { requireAuth } = require('./auth');
const ctrl = require('../controllers/reservationController');

router.use(requireAuth);

router.get('/',       ctrl.list);
router.get('/today',  ctrl.today);
router.get('/stats',  ctrl.stats);
router.get('/report', ctrl.report);
router.post('/',      ctrl.create);
router.get('/:id',    ctrl.get);
router.put('/:id',    ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
