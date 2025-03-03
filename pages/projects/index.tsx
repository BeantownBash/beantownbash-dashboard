import { GetServerSideProps } from 'next';
import { BsGithub, BsLink45Deg, BsYoutube } from 'react-icons/bs';
import Image from 'next/image';
import { useRouter } from 'next/router';
import React from 'react';
import { Tag } from '@prisma/client';
import { getServerSession } from 'next-auth';
import Button from '@/components/Button';
import prisma from '@/lib/prisma';
import { LightProjectData } from '@/types/ProjectData';
import { selectRandomPlaceholder } from '@/lib/utils';
import { TagStrings } from '@/lib/textutils';
import { authOptions } from '../api/auth/[...nextauth]';

export const getServerSideProps: GetServerSideProps = async (context) => {
    const session = await getServerSession(
        context.req,
        context.res,
        authOptions,
    );

    let user = null;
    if (session?.user?.email) {
        user = await prisma.user.findUnique({
            where: { email: session?.user?.email },
        });
    }

    const projects = await prisma.project.findMany({
        include: {
            logo: true,
        },
    });

    const directoryDisabled = await prisma.systemConfigSetting.findUnique({
        where: {
            key: 'directoryDisabled',
        },
    });

    const directoryDisabledValue = directoryDisabled?.value ?? false;
    const userIsAdminValue = user?.isAdmin ?? false;

    return {
        props: {
            directoryDisabled: directoryDisabledValue,
            // show directory if user is an admin
            projects:
                !directoryDisabledValue || userIsAdminValue
                    ? projects.map((project) => ({
                          id: project.id,
                          title: project.title,
                          tagline: project.tagline,
                          description: project.description,
                          tags: project.tags,
                          githubLink: project.githubLink,
                          websiteLink: project.websiteLink,
                          videoLink: project.videoLink,
                          logo: project.logo
                              ? {
                                    id: project.logo?.id,
                                    url: project.logo?.url,
                                }
                              : null,
                      }))
                    : [],
            userIsAdmin: userIsAdminValue,
        },
    };
};

export default function Projects({
    directoryDisabled,
    projects,
    userIsAdmin,
}: {
    directoryDisabled: boolean;
    projects: LightProjectData[];
    userIsAdmin: boolean;
}) {
    const router = useRouter();
    const [selectedTag, setSelectedTag] = React.useState<Tag | null>(null);

    const filteredProjects = React.useMemo(() => {
        if (selectedTag === null) {
            return projects;
        }
        return projects.filter((project) => project.tags.includes(selectedTag));
    }, [projects, selectedTag]);

    const showDirectory = !directoryDisabled || userIsAdmin;

    return (
        <div className="mx-auto max-w-4xl px-8 py-8">
            <h1 className="mb-4 font-display text-4xl font-extrabold">
                All Projects
            </h1>

            {directoryDisabled && userIsAdmin && (
                <div className="mb-4 rounded-xl border-4 border-indigo-700 py-2 px-4">
                    The project directory is currently HIDDEN.
                    <br />
                    You are able to see it because you are an administrator.
                </div>
            )}

            {showDirectory && (
                <div className="my-4">
                    <span className="mr-4 font-medium">Filter: </span>
                    <div className="inline-flex flex-wrap gap-4">
                        {Object.entries(TagStrings).map(
                            ([tag, { color, name }]) => {
                                // show only selected tag if one is selected
                                if (
                                    selectedTag !== null &&
                                    selectedTag !== tag
                                ) {
                                    return null;
                                }

                                return (
                                    <label
                                        className="relative inline-flex cursor-pointer items-center"
                                        key={tag}
                                    >
                                        <input
                                            type="checkbox"
                                            value=""
                                            className="peer sr-only"
                                            checked={selectedTag === tag}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedTag(tag as Tag);
                                                } else {
                                                    setSelectedTag(null);
                                                }
                                            }}
                                        />
                                        <div
                                            className={`${color} peer rounded-full py-1 px-6 peer-checked:ring-4 peer-checked:ring-teal-400 peer-focus:outline-none`}
                                        >
                                            {name}
                                        </div>
                                    </label>
                                );
                            },
                        )}
                    </div>
                </div>
            )}

            {showDirectory ? (
                filteredProjects.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {filteredProjects.map((project) => (
                            // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
                            <div
                                role="article"
                                className="flex cursor-pointer flex-col items-stretch justify-start gap-4 rounded-lg border border-zinc-400 bg-zinc-700 px-4 py-4 transition-shadow hover:shadow-lg hover:shadow-zinc-400/20"
                                key={project.id}
                                onClick={() => {
                                    router.push(`/projects/${project.id}`);
                                }}
                            >
                                <div className="flex flex-row gap-4">
                                    <div className="flex w-20 flex-col">
                                        {project.logo ? (
                                            <Image
                                                src={project.logo.url}
                                                alt=""
                                                width={512}
                                                height={512}
                                                className="aspect-square h-full w-full rounded-2xl object-contain"
                                            />
                                        ) : (
                                            <Image
                                                src={selectRandomPlaceholder(
                                                    project.id,
                                                )}
                                                alt=""
                                                width={512}
                                                height={512}
                                                className="aspect-square h-full w-full rounded-2xl object-contain"
                                            />
                                        )}
                                    </div>
                                    <div className="flex flex-1 flex-col items-start">
                                        <p className="mb-1 font-display text-2xl font-semibold">
                                            {project.title}
                                        </p>
                                        {project.tagline &&
                                            project.tagline.length > 0 && (
                                                <p className="text-lg leading-snug">
                                                    {project.tagline}
                                                </p>
                                            )}
                                    </div>
                                </div>
                                {project.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {project.tags.map((tag) => (
                                            <div
                                                key={tag}
                                                className={`${TagStrings[tag].color} rounded-full py-1 px-6`}
                                            >
                                                {TagStrings[tag].name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {(project.githubLink ||
                                    project.websiteLink ||
                                    project.videoLink) && (
                                    <div className="items-between flex flex-row gap-2">
                                        {project.githubLink && (
                                            <a
                                                href={project.githubLink}
                                                className="w-full"
                                            >
                                                <Button
                                                    colorType="lightgray"
                                                    fullWidth
                                                >
                                                    <BsGithub className="inline-block h-6 w-6" />
                                                </Button>
                                            </a>
                                        )}
                                        {project.websiteLink && (
                                            <a
                                                href={project.websiteLink}
                                                className="w-full"
                                            >
                                                <Button
                                                    colorType="lightgray"
                                                    fullWidth
                                                >
                                                    <BsLink45Deg className="inline-block h-6 w-6" />
                                                </Button>
                                            </a>
                                        )}
                                        {project.videoLink && (
                                            <a
                                                href={project.videoLink}
                                                className="w-full"
                                            >
                                                <Button
                                                    colorType="lightgray"
                                                    fullWidth
                                                >
                                                    <BsYoutube className="inline-block h-6 w-6" />
                                                </Button>
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>No projects yet. 🥲</p>
                )
            ) : (
                <p>
                    Sorry, the project directory is disabled at this time. Happy
                    hacking!
                </p>
            )}
        </div>
    );
}
