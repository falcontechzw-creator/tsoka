export type QuestionType = 'single' | 'multi' | 'scale' | 'text' | 'short'

export type Question = {
  id: string
  text: string
  type: QuestionType
  options?: string[]
  scaleLow?: string
  scaleHigh?: string
  followUp?: string          // shown as a free-text box under the question
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
      { id: 'type', text: 'What type of diabetes do you have?', type: 'single',
        options: ['Type 1', 'Type 2', 'Gestational', 'Not sure'] },
      { id: 'visits', text: 'How often do you get to a clinic for your diabetes?', type: 'single',
        options: ['Weekly', 'Monthly', 'Every few months', 'Rarely', 'Never'] },
      { id: 'travel', text: 'Roughly how far do you travel to the clinic, and what does it cost?',
        type: 'short', optional: true },
      { id: 'last_check', text: 'When did a health worker last examine your feet?', type: 'single',
        options: ['Within the last month', '1 to 6 months ago', 'More than 6 months ago', 'Never'] },
      { id: 'educated', text: 'Has a health worker ever explained why foot care matters with diabetes?',
        type: 'single', options: ['Yes', 'No', 'Not sure'] },
      { id: 'had_wound', text: 'Have you ever had a sore, blister, cut or wound on your foot?',
        type: 'single', options: ['Yes', 'No'],
        followUp: 'If yes, what happened and how was it treated?' },
      { id: 'self_check',
        text: 'How often do you look closely at your own feet, checking the soles and between the toes for cuts, sores or redness?',
        type: 'single',
        options: ['Every day', 'A few times a week', 'Now and then', 'Only if something hurts', 'Never'] },
      { id: 'barriers',
        text: 'Is there anything that makes it hard for you to look at your own feet properly?',
        type: 'multi',
        options: ['No, I can see them easily', 'My eyesight is not good enough',
                  'I cannot bend or reach my feet', 'Nobody showed me what to look for',
                  'I do not think to do it', 'Something else'] },
      { id: 'knows_amputee',
        text: 'Do you personally know someone who lost a toe, foot or limb because of diabetes?',
        type: 'single', options: ['Yes', 'No'] },
      { id: 'worry', text: 'How worried are you about developing a foot problem?',
        type: 'scale', scaleLow: 'Not worried at all', scaleHigh: 'Very worried' },

      { id: 'would_use', afterPitch: true,
        text: 'If a free 20-second foot scan were offered at your clinic, how likely would you be to use it?',
        type: 'scale', scaleLow: 'Very unlikely', scaleHigh: 'Very likely' },
      { id: 'want_warning', afterPitch: true,
        text: 'Would you want to be told if the scan found a warning sign, even before you could feel anything?',
        type: 'single', options: ['Yes', 'No', 'Not sure'] },
      { id: 'use_app', afterPitch: true,
        text: 'Would you use a phone app to see your own results and log your readings?',
        type: 'single', options: ['Yes', 'No', 'I do not have a smartphone'] },
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
      { id: 'tools', text: 'What do you currently use to check a diabetic foot?', type: 'multi',
        options: ['Visual inspection only', 'Monofilament test', 'Tuning fork',
                  'Nothing formal', 'Other'] },
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
      { id: 'operator', afterPitch: true,
        text: 'Who in the clinic should be responsible for operating a device like this?',
        type: 'single',
        options: ['Nurse', 'Nurse aide', 'Health promoter', 'The patient themselves', 'Other'] },
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

  /* -------------------------------- FUNDERS ------------------------------- */
  funders: {
    key: 'funders',
    title: 'Medical aid and health funders',
    audience: 'For staff in claims, care management or wellness at a medical aid society.',
    intro: CONSENT,
    questions: [
      { id: 'role', text: 'What is your role or department?', type: 'short' },
      { id: 'tracks',
        text: 'Does your scheme currently track diabetic foot complications as their own cost category?',
        type: 'single', options: ['Yes', 'No', 'Not sure'] },
      { id: 'costs', text: 'Where do diabetes-related costs concentrate most, in your experience?',
        type: 'multi', options: ['Medication', 'Admissions and surgery', 'Rehabilitation',
                                 'Outpatient visits', 'Other'] },
      { id: 'existing',
        text: 'Do you currently fund any preventive screening programme for a chronic disease?',
        type: 'single', options: ['Yes', 'No', 'Not sure'],
        followUp: 'If yes, which one?' },
      { id: 'openness',
        text: 'How open would your organisation be to funding a device-based prevention pilot?',
        type: 'scale', scaleLow: 'Not open at all', scaleHigh: 'Very open' },
      { id: 'model', text: 'What funding model would you prefer?', type: 'single',
        options: ['Buy the device outright', 'Pay per screening performed',
                  'A subscription per clinic', 'Other'] },
      { id: 'evidence',
        text: 'What evidence would your organisation need before funding a wider rollout?',
        type: 'text' },
      { id: 'approver', text: 'Who would need to approve a decision like this?',
        type: 'short', optional: true },
    ],
  },

  /* ------------------------------- MANAGERS ------------------------------- */
  managers: {
    key: 'managers',
    title: 'Clinic and pharmacy managers',
    audience: 'For whoever decides what equipment enters a facility.',
    intro: CONSENT,
    questions: [
      { id: 'facility_type', text: 'What type of facility is this?', type: 'single',
        options: ['Clinic', 'Pharmacy', 'Polyclinic', 'Community health point', 'Other'] },
      { id: 'power', text: 'How reliable is your power supply?', type: 'single',
        options: ['Always on', 'Occasional outages', 'Frequent outages', 'No reliable power'] },
      { id: 'internet', text: 'How reliable is your internet connection?', type: 'single',
        options: ['Always on', 'Occasional outages', 'Frequent outages', 'No internet'] },
      { id: 'approver', text: 'Who approves new equipment coming into this facility?',
        type: 'short' },
      { id: 'trial_openness',
        text: 'How open are you to trialling a new screening device free of charge?',
        type: 'scale', scaleLow: 'Not open at all', scaleHigh: 'Very open' },
      { id: 'storage', text: 'Could this facility store and charge a small device safely?',
        type: 'single', options: ['Yes', 'No', 'Not sure'] },
      { id: 'space',
        text: 'Is there floor space where a patient could stand on a mat with some privacy?',
        type: 'single', options: ['Yes, easily', 'Yes, with some rearranging', 'No'] },
      { id: 'past_tech',
        text: 'Tell us about the last time new health technology was introduced here.',
        type: 'text', optional: true },
    ],
  },
}

export const SEGMENT_LIST = Object.values(SEGMENTS)