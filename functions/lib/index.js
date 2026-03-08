"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureFactorForNewUser = exports.onNewSceneNotify = exports.trackProjectView = exports.getCloudinarySignature = void 0;
const admin = __importStar(require("firebase-admin"));
const cloudinary_1 = require("cloudinary");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
if (!admin.apps.length) {
    admin.initializeApp();
}
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
exports.getCloudinarySignature = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    }
    const { projectId, fileName } = request.data || {};
    if (!projectId || !fileName) {
        throw new https_1.HttpsError('invalid-argument', 'projectId and fileName are required');
    }
    const timestamp = Math.round(Date.now() / 1000);
    const folder = `projects/${projectId}`;
    const signature = cloudinary_1.v2.utils.api_sign_request({
        timestamp,
        folder,
    }, process.env.CLOUDINARY_API_SECRET);
    return {
        timestamp,
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    };
});
exports.trackProjectView = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    }
    const { projectId } = request.data || {};
    if (!projectId) {
        throw new https_1.HttpsError('invalid-argument', 'projectId is required');
    }
    const db = admin.firestore();
    const projectRef = db.collection('projects').doc(projectId);
    await projectRef.set({
        totalViews: admin.firestore.FieldValue.increment(1),
        lastViewedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { ok: true };
});
exports.onNewSceneNotify = (0, firestore_1.onDocumentCreated)('projects/{projectId}/scenes/{sceneId}', async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const data = snap.data();
    const projectId = event.params.projectId;
    const db = admin.firestore();
    const projectRef = db.collection('projects').doc(projectId);
    const projectSnap = await projectRef.get();
    const projectData = projectSnap.data();
    const clientId = projectData?.clientId;
    if (!clientId) {
        return;
    }
    const notificationsRef = db
        .collection('users')
        .doc(clientId)
        .collection('notifications');
    await notificationsRef.add({
        type: 'new_week',
        message: `New ${data.roomName ?? 'room'} added for week ${data.weekNumber}.`,
        projectId,
        sceneId: snap.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
    });
});
exports.ensureFactorForNewUser = (0, firestore_1.onDocumentCreated)('users/{userId}', async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const data = snap.data();
    if (data.role !== 'customer') {
        return;
    }
    const userId = event.params.userId;
    const db = admin.firestore();
    const factorRef = db.collection('factors').doc(userId);
    const existing = await factorRef.get();
    if (existing.exists) {
        return;
    }
    await factorRef.set({
        customerId: userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        totalPurchases: 0,
        totalPaid: 0,
        balance: 0,
    });
});
