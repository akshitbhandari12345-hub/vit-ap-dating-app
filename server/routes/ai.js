import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../config/firebase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

/**
 * POST /api/ai/compatibility
 * Private AI Microservice Endpoint.
 * Invokes Gemini AI safely in private backend subnet to generate profile compatibility & icebreakers.
 */
router.post('/compatibility', async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUid = req.user.uid;

    if (!targetUserId) {
      return res.status(400).json({ error: 'Missing targetUserId' });
    }

    // Fetch both user profiles securely from private DB
    const [userDoc, targetDoc] = await Promise.all([
      db.collection('users').doc(currentUid).get(),
      db.collection('users').doc(targetUserId).get(),
    ]);

    if (!userDoc.exists || !targetDoc.exists) {
      return res.status(404).json({ error: 'User profile not found for AI evaluation' });
    }

    const userP = userDoc.data();
    const targetP = targetDoc.data();

    // Check if Gemini API key is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback heuristic scoring if GEMINI_API_KEY is not yet supplied in .env
      const sharedInterests = (userP.interests || []).filter(i => (targetP.interests || []).includes(i));
      const score = Math.min(95, 60 + sharedInterests.length * 12);
      return res.json({
        compatibilityScore: score,
        sharedInterests,
        icebreaker: `Hey! I noticed we both like ${sharedInterests[0] || 'hanging out at VIT AP campus'}!`,
        source: 'Heuristic Engine (Set GEMINI_API_KEY in server/.env for AI Generation)',
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are a campus matchmaker AI for VIT AP University students.
Compare these two student profiles and generate a JSON object with:
1. "compatibilityScore": integer between 60 and 99
2. "commonGround": brief 1 sentence on what they have in common (e.g. shared branch, interests)
3. "icebreaker": fun, friendly 1-line opener tailored for student campus life

User 1 (${userP.name}):
- Branch: ${userP.branch}, Year: ${userP.year}
- Bio: ${userP.bio}
- Interests: ${(userP.interests || []).join(', ')}

User 2 (${targetP.name}):
- Branch: ${targetP.branch}, Year: ${targetP.year}
- Bio: ${targetP.bio}
- Interests: ${(targetP.interests || []).join(', ')}

Respond strictly in valid JSON format with keys: compatibilityScore, commonGround, icebreaker.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text() || '';
    let parsedResult = {};
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        parsedResult = JSON.parse(responseText);
      }
    } catch (e) {
      parsedResult = {
        compatibilityScore: 85,
        commonGround: 'You both share common campus interests and goals.',
        icebreaker: 'Hey! Ready for campus tech talks?',
      };
    }

    return res.json({
      success: true,
      compatibilityScore: parsedResult.compatibilityScore || 85,
      commonGround: parsedResult.commonGround || 'Shared student interests',
      icebreaker: parsedResult.icebreaker || 'Hi there! Nice to connect with a fellow VITian!',
      source: 'Private Subnet Gemini AI Microservice',
    });
  } catch (error) {
    console.error('[AI Microservice Error]:', error);
    return res.status(500).json({ error: 'AI processing failed', details: error.message });
  }
});

export default router;
