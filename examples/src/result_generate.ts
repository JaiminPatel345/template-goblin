import { writeFile } from 'node:fs/promises'
import { loadTemplate, generatePDF } from 'template-goblin'

// Load the template ONCE (parses ZIP, fonts, images into memory)
const template = await loadTemplate('./examples/tgbl_files/result.tgbl')

// Fill it with data — keys must match the field names in your template
const data = {
  texts: {
    result_date: '05-05-2026',
    Total: '600',
    total: '700',
    pass_fail: 'Pass',
  },
  tables: {
    subjects: [
      { sr_no: '1', subject_name: 'English', total_marks: '100', obtain_marks: '85', grade: 'A' },
      { sr_no: '2', subject_name: 'Hindi', total_marks: '100', obtain_marks: '78', grade: 'B+' },
      {
        sr_no: '3',
        subject_name: 'Mathematics',
        total_marks: '100',
        obtain_marks: '92',
        grade: 'A+',
      },
      { sr_no: '4', subject_name: 'Science', total_marks: '100', obtain_marks: '88', grade: 'A' },
      {
        sr_no: '5',
        subject_name: 'Social Studies',
        total_marks: '100',
        obtain_marks: '81',
        grade: 'A',
      },
      { sr_no: '6', subject_name: 'Sanskrit', total_marks: '100', obtain_marks: '89', grade: 'A' },
      {
        sr_no: '7',
        subject_name: 'Computer Sci.',
        total_marks: '100',
        obtain_marks: '87',
        grade: 'A',
      },
    ],
  },
  images: {
    student_image: '/home/jaimin/Pictures/profile.jpg',
  },
}

const pdf = await generatePDF(template, data)
await writeFile('./result.pdf', pdf)
console.log('Wrote result.pdf')
