import type { NextApiRequest, NextApiResponse } from 'next';
import { createId } from '@paralleldrive/cuid2';
import * as fs from 'fs';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/prisma';

const maxSize = 5000000; // 5MB

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<object>,
) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        res.status(405).json({ e: 'Method Not Allowed' });
        return;
    }

    try {
        const forbidEditing = await prisma.systemConfigSetting.findUnique({
            where: {
                key: 'forbidEditing',
            },
        });

        if (forbidEditing?.value === true) {
            res.status(400).json({
                e: 'Bad Request: Project editing is not currently allowed',
            });
            return;
        }

        const reportedSize = req.headers['content-length'] ?? 0;
        if (reportedSize > maxSize) {
            res.status(413).json({ e: 'Resource size exceeds limit (5MB)' });
        } else {
            const session = await getServerSession(req, res, authOptions);

            if (!session) {
                res.status(401).json({ e: 'Unauthorized' });
                return;
            }

            const currentBanner = await prisma.user
                .findUnique({
                    where: { email: session.user.email },
                })
                .project()
                .banner();

            if (currentBanner) {
                await prisma.bannerImage.delete({
                    where: {
                        id: currentBanner.id,
                    },
                });

                fs.promises
                    .unlink(`./data/uploads/${currentBanner.id}.jpg`)
                    .catch((e) => {
                        console.error('Error deleting image file', e);
                    });
            }

            const id = createId();

            await prisma.bannerImage.create({
                data: {
                    id,
                    url: `/api/res/images/${id}`,
                    projectId: session.user.projectId,
                },
            });

            const filename = `./data/uploads/${id}.jpg`;
            await fs.promises.mkdir('./data/uploads', { recursive: true });
            const fileStream = fs.createWriteStream(filename);
            let size = 0;
            let successful = true;

            req.on('data', (data) => {
                size += data.length;

                if (size > maxSize) {
                    req.destroy(); // Abort the response (close and cleanup the stream)
                    req.unpipe(fileStream);
                    fs.promises.unlink(filename); // Delete the file we were downloading the data to
                    res.status(413).json({
                        e: 'Resource size exceeds limit (5MB)',
                    });
                    successful = false;
                }
            }).pipe(fileStream);
            if (successful) {
                res.status(200).json({
                    url: `/api/res/images/${id}`,
                });
            }
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ e: 'Internal Server Error' });
    }
}

export const config = {
    api: {
        bodyParser: false,
    },
};
