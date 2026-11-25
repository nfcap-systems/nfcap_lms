'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { createCourse } from '@/lib/actions/courses';
import type { CourseAccess } from '@/lib/types';
import { Button } from '@/components/admin-ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/admin-ui/dialog';
import { Input } from '@/components/admin-ui/input';
import { Label } from '@/components/admin-ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/admin-ui/select';
import { Textarea } from '@/components/admin-ui/textarea';

export function NewCourseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [access, setAccess] = useState<CourseAccess>('open');
  const [submitting, setSubmitting] = useState(false);

  const valid =
    title.trim().length > 0 && description.trim().length > 0 && category.trim().length > 0;

  const reset = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setAccess('open');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New course</DialogTitle>
          <DialogDescription>
            Appended to the end of the apprenticeship pathway. You&apos;ll build its curriculum
            next.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-create-course-title">Course title</Label>
            <Input
              id="quick-create-course-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Baseboard & Trim Finishing"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-create-course-description">Description</Label>
            <Textarea
              id="quick-create-course-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this course covers..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-create-course-category">Category</Label>
            <Input
              id="quick-create-course-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Trade Skills"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quick-create-course-access">Enrollment</Label>
            <Select value={access} onValueChange={(value) => setAccess(value as CourseAccess)}>
              <SelectTrigger id="quick-create-course-access" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open — learners can self-enroll</SelectItem>
                <SelectItem value="restricted">Restricted — assigned by NFCAP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid || submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                const { slug } = await createCourse({
                  title: title.trim(),
                  description: description.trim(),
                  category: category.trim(),
                  access,
                });
                toast.success('Course created');
                onOpenChange(false);
                reset();
                router.push(`/admin/courses/${slug}`);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Could not create the course.');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Create course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
