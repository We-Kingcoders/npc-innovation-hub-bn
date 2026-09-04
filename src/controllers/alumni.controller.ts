import { Request, Response } from 'express';
import Member from '../models/member.model';
import Alumnus from '../models/alumnus.model';

interface PublicAlumniEntry {
  name: string;
  imageUrl: string | null;
  role: string;
}

interface SortableAlumniEntry extends PublicAlumniEntry {
  sortDate: Date;
}

// GET /api/alumni - public, no auth. Merges two independent sources into one
// list, each projected down to exactly the 3 public fields (name, imageUrl,
// role) - never userId/isAlumni/alumniSince from Member, never
// cloudinaryPublicId/createdBy from Alumnus. Deliberately no `source` field
// on the response: the public list is meant to read as one unified group of
// alumni, and which underlying table a person came from isn't something the
// public frontend needs to know or branch on.
export const getPublicAlumni = async (req: Request, res: Response): Promise<void> => {
  try {
    const [alumniMembers, standaloneAlumni] = await Promise.all([
      Member.findAll({
        where: { isAlumni: true },
        attributes: ['name', 'imageUrl', 'role', 'alumniSince', 'createdAt'],
      }),
      Alumnus.findAll({
        attributes: ['fullName', 'imageUrl', 'role', 'createdAt'],
      }),
    ]);

    const fromMembers: SortableAlumniEntry[] = alumniMembers.map((member) => ({
      name: member.name,
      imageUrl: member.imageUrl,
      role: member.role,
      sortDate: member.alumniSince ?? member.createdAt,
    }));

    const fromAlumnus: SortableAlumniEntry[] = standaloneAlumni.map((alumnus) => ({
      name: alumnus.fullName,
      imageUrl: alumnus.imageUrl,
      role: alumnus.role,
      sortDate: alumnus.createdAt,
    }));

    // Most recently added alumni first - a judgment call (not a spec
    // requirement), using alumniSince for promoted members and createdAt for
    // standalone alumni as each source's equivalent "when they became
    // alumni" timestamp.
    const combined = [...fromMembers, ...fromAlumnus].sort(
      (a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime()
    );

    const alumni: PublicAlumniEntry[] = combined.map(({ name, imageUrl, role }) => ({ name, imageUrl, role }));

    res.status(200).json({
      status: 'success',
      results: alumni.length,
      data: { alumni },
    });
  } catch (error) {
    console.error('Error fetching public alumni:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching alumni',
    });
  }
};
