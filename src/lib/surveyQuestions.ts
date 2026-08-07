export type QuestionType = 'single' | 'multi' | 'scale' | 'text' | 'short'

export type Question = {
  id: string
  text: string
  type: QuestionType
  options?: string[]
  scaleLow?: string
  scaleHigh?: string
  followUp?: string          // free-text box shown under the question
  afterPitch?: boolean       // belongs in the "after you describe Tsoka" block
  optional?: boolean
}

export type Segment = {
  key: string
  title: string
  audience: string
  intro: string
  questions: Question[]
}

const CONSENT =
  'This is a student project for the Cimas Healthathon. Taking part is voluntary, ' +
  'your name will not be published, and you can stop at any time. We are not able to ' +
  'give medical advice, please speak to a nurse or doctor about any symptoms.'

/** Shared list so the same feature wording is used across groups. */
const FEATURE_OPTIONS = [
  'Reminders to take medication',
  'Seeing my foot scan results',
  'Logging blood sugar, blood pressure and weight',
  'Appointment reminders',
  'Sending a message to my nurse',
  'Daily foot care tips',
]

export const SEGMENTS: Record<string, Segment> = {

  /* ------------------------------- PATIENTS ------------------------------- */
  patients: {
    key: 'patients',
    title: 'People living with diabetes',
    audience: 'For adults diagnosed with type 1 or type 2 diabetes.',
    intro: CONSENT,
    questions: [
      { id: 'age', text: 'What is your age?', type: 'single',
        options: ['Under 30', '30 to 44', '45 to 59', '60 to 74', '75 or older'] },
      { id: 'gender', text: 'Are you male or female?', type: 'single',
        options: ['Male', 'Female', 'Prefer not to say'] },
      { id: 'years', text: 'How long have you been living with diabetes?', type: 'single',
        options: ['Less than 1 year', '1 to 5 years', '6 to 10 years', 'More than 10 years'] },
      { id: 'visits', text: 'How often do you get to a clinic for your diabetes?', type: 'single',
        options: ['Weekly', 'Monthly', 'Every few months', 'Rarely', 'Never'] },
      { id: 'last_check', text: 'When did a health worker last examine your feet?', type: 'single',
        options: ['Within the last month', '1 to 6 months ago', 'More than 6 months ago', 'Never'] },
      { id: 'had_wound', text: 'Have you ever had a sore, blister, cut or wound on your foot?',
        type: 'single', options: ['Yes', 'No'],
        followUp: 'If yes, what happened and how was it treated?' },
      { id: 'self_check',
        text: 'How often do you look closely at your own feet, checking the soles and between the toes?',
        type: 'single',
        options: ['Every day', 'A few times a week', 'Now and then', 'Only if something hurts', 'Never'] },
      { id: 'barriers',
        text: 'Is there anything that makes it hard for you to look at your own feet properly?',
        type: 'multi',
        options: ['No, I can see them easily', 'My eyesight is not good enough',
                  'I cannot bend or reach my feet', 'Nobody showed me what to look for',
                  'I do not think to do it', 'Something else'] },
      { id: 'meds_missed',
        text: 'How often do you forget to take your diabetes medication?', type: 'single',
        options: ['Never', 'Once in a while', 'About once a week', 'Several times a week',
                  'I do not take medication'] },
      { id: 'worry', text: 'How worried are you about developing a foot problem?',
        type: 'scale', scaleLow: 'Not worried at all', scaleHigh: 'Very worried' },

      { id: 'would_use', afterPitch: true,
        text: 'If a free 20-second foot scan were offered at your clinic, how likely would you be to use it?',
        type: 'scale', scaleLow: 'Very unlikely', scaleHigh: 'Very likely' },
      { id: 'reminder_interest', afterPitch: true,
        text: 'How interested would you be in an app that reminds you to take your medication?',
        type: 'scale', scaleLow: 'Not interested', scaleHigh: 'Very interested' },
      { id: 'features', afterPitch: true,
        text: 'Which of these would actually be useful to you? Choose all that apply.',
        type: 'multi', options: FEATURE_OPTIONS },
      { id: 'use_app', afterPitch: true,
        text: 'Would you be able to use a phone app for this?',
        type: 'single', options: ['Yes, easily', 'Yes, with some help',
                                  'No, I do not have a smartphone', 'No, I would find it difficult'] },
      { id: 'pay', afterPitch: true,
        text: 'What would you be willing to pay for a screening, if anything?',
        type: 'single',
        options: ['Nothing extra, it should be free', 'A small fee', 'I am not sure',
                  'I would rather my medical aid covered it'] },
      { id: 'other', afterPitch: true,
        text: 'Anything else you want to tell us about your feet or your diabetes care?',
        type: 'text', optional: true },
    ],
  },

  /* ------------------------------ CAREGIVERS ------------------------------ */
  caregivers: {
    key: 'caregivers',
    title: 'Family and carers',
    audience: 'For relatives, spouses or carers of someone living with diabetes.',
    intro: CONSENT,
    questions: [
      { id: 'relationship', text: 'What is your relationship to the person with diabetes?',
        type: 'single',
        options: ['Spouse or partner', 'Son or daughter', 'Parent', 'Other relative',
                  'Paid carer', 'Friend or neighbour'] },
      { id: 'live_together', text: 'Do you live in the same house as them?', type: 'single',
        options: ['Yes', 'No, but nearby', 'No, far away'] },
      { id: 'duration', text: 'How long have you been helping to care for them?',
        type: 'single', options: ['Less than a year', '1 to 5 years', 'More than 5 years'] },
      { id: 'help_with', text: 'What do you help them with? Choose all that apply.',
        type: 'multi',
        options: ['Remembering medication', 'Getting to the clinic', 'Checking their feet',
                  'Preparing meals', 'Paying for care', 'Nothing specific'] },
      { id: 'foot_aware',
        text: 'Did you know that foot problems are a serious risk with diabetes?',
        type: 'single', options: ['Yes, I knew this well', 'I had heard something about it',
                                  'No, this is new to me'] },
      { id: 'seen_problem',
        text: 'Have you ever noticed a foot problem on them before they did?',
        type: 'single', options: ['Yes', 'No', 'I have never looked'] },
      { id: 'challenge',
        text: 'What is the hardest part of supporting them? Choose all that apply.',
        type: 'multi',
        options: ['Getting them to take medication on time', 'Cost of care and transport',
                  'Not knowing what to watch out for', 'Distance to the clinic',
                  'They do not want help', 'Finding the time'] },
      { id: 'worry', text: 'How worried are you about their health?',
        type: 'scale', scaleLow: 'Not worried at all', scaleHigh: 'Very worried' },

      { id: 'would_encourage', afterPitch: true,
        text: 'How likely would you be to encourage them to have this scan?',
        type: 'scale', scaleLow: 'Very unlikely', scaleHigh: 'Very likely' },
      { id: 'reminder_interest', afterPitch: true,
        text: 'How interested would you be in an app that reminds them to take their medication?',
        type: 'scale', scaleLow: 'Not interested', scaleHigh: 'Very interested' },
      { id: 'features', afterPitch: true,
        text: 'Which of these would help you support them? Choose all that apply.',
        type: 'multi',
        options: ['Reminders to take medication',
                  'Seeing their foot scan results',
                  'Being alerted if a problem is found',
                  'Appointment reminders',
                  'Guidance on what to look for',
                  'Being able to message their nurse'] },
      { id: 'other', afterPitch: true,
        text: 'Anything else you want to tell us about caring for them?',
        type: 'text', optional: true },
    ],
  },

  /* -------------------------------- NURSES -------------------------------- */
  nurses: {
    key: 'nurses',
    title: 'Nurses and clinic staff',
    audience: 'For nurses, nurse aides and diabetes educators.',
    intro: CONSENT,
    questions: [
      { id: 'role', text: 'What is your role?', type: 'single',
        options: ['Nurse', 'Nurse aide', 'Diabetes educator', 'Other'] },
      { id: 'facility', text: 'Which clinic or facility are you based at?', type: 'short' },
      { id: 'volume', text: 'Roughly how many diabetic patients do you see in a typical week?',
        type: 'single', options: ['Fewer than 10', '10 to 25', '26 to 50', 'More than 50'] },
      { id: 'examines', text: 'Do you examine feet as part of a routine diabetes visit?',
        type: 'single', options: ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never'] },
      { id: 'duration', text: 'On average, how long does a foot check take you?', type: 'single',
        options: ['Under 2 minutes', '2 to 5 minutes', '6 to 10 minutes',
                  'More than 10 minutes', 'We do not do them'] },
      { id: 'ulcer_count',
        text: 'In the last six months, roughly how many diabetic foot ulcers have you seen here?',
        type: 'single', options: ['None', '1 to 5', '6 to 15', 'More than 15', 'Not sure'] },
      { id: 'ulcer_stage', text: 'If any, at what stage do they usually arrive?', type: 'single',
        options: ['Early, no open wound yet', 'Small open wound', 'Infected wound',
                  'Severe, risk of amputation', 'Not applicable, I have seen none'] },
      { id: 'records', text: 'How do you keep track of a patient between visits?', type: 'single',
        options: ['Paper file', 'Electronic record', 'We do not really track this', 'Other'] },
      { id: 'internet', text: 'How reliable is your internet connection at this facility?',
        type: 'single', options: ['Always reliable', 'Reliable most of the time',
                                  'Unreliable most of the time', 'No internet'] },

      { id: 'usefulness', afterPitch: true,
        text: 'How useful would an automatic green, amber or red foot risk score be to your work?',
        type: 'scale', scaleLow: 'Not useful', scaleHigh: 'Extremely useful' },
      { id: 'features', afterPitch: true,
        text: 'Which parts of the system would be most useful to you? Choose all that apply.',
        type: 'multi',
        options: ['Automatic risk scoring', 'Alerts when a patient needs review',
                  'Seeing a patient history over time', 'A list of patients overdue for screening',
                  'Messaging patients directly', 'Working offline when the network is down'] },
      { id: 'where_fits', afterPitch: true,
        text: 'Where would a 20-second scan realistically fit into a visit?', type: 'single',
        options: ['At reception before they are seen', 'During the consultation',
                  'After the consultation', 'It would not fit'] },
      { id: 'trust', afterPitch: true,
        text: 'What would make you trust, or distrust, a result from a screening device?',
        type: 'text' },
      { id: 'other', afterPitch: true,
        text: 'Anything else about your daily foot-care workflow you want to add?',
        type: 'text', optional: true },
    ],
  },

  /* ------------------------------- DOCTORS -------------------------------- */
  doctors: {
    key: 'doctors',
    title: 'Doctors and specialists',
    audience: 'For general practitioners, physicians and podiatrists.',
    intro: CONSENT + ' We would rather be challenged than agreed with, please be blunt.',
    questions: [
      { id: 'specialty', text: 'What is your specialty?', type: 'single',
        options: ['General practice', 'Internal medicine', 'Podiatry', 'Other'] },
      { id: 'advanced',
        text: 'Roughly what share of your diabetic patients present with a foot complication already advanced?',
        type: 'single', options: ['Under 10%', '10 to 30%', '30 to 50%', 'Over 50%'] },
      { id: 'credibility',
        text: 'How clinically credible do you find temperature asymmetry as an early warning sign?',
        type: 'scale', scaleLow: 'Not credible', scaleHigh: 'Very credible' },
      { id: 'threshold',
        text: 'What temperature difference would you consider clinically meaningful?',
        type: 'single', options: ['Under 1.5 °C', '1.5 to 2.2 °C', '2.2 to 3 °C',
                                  'Over 3 °C', 'I would not use temperature alone'] },
      { id: 'confounders',
        text: 'Besides an ulcer forming, what else could cause a warm spot on the foot?',
        type: 'multi', options: ['Infection elsewhere in the body', 'General inflammation',
                                 'A recent injury', 'Vascular disease', 'Charcot foot',
                                 'Something else'] },
      { id: 'limitation',
        text: 'What is the biggest limitation of a device that measures temperature only?',
        type: 'text' },
      { id: 'triage',
        text: 'Would you support this being used as a triage step before a full clinical exam?',
        type: 'single', options: ['Yes', 'No', 'Yes, with reservations'],
        followUp: 'If you have reservations, what are they?' },
      { id: 'evidence',
        text: 'What would you need to see from a pilot before you were convinced either way?',
        type: 'text' },
      { id: 'referral', text: 'Is there anyone else you would suggest we speak to?',
        type: 'short', optional: true },
    ],
  },
}

export const SEGMENT_LIST = Object.values(SEGMENTS)