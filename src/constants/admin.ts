/**
 * Admin Configuration for Vratsa Civic Platform
 */

export const ADMIN_USER_ID = 'CNVGNLTvMdeDh9J2LYkofozpmQ42';

/**
 * Checks if the current user/volunteer is the designated platform administrator
 */
export const isAdminUser = (volunteer?: { id?: string } | null): boolean => {
  return Boolean(volunteer?.id && volunteer.id === ADMIN_USER_ID);
};
