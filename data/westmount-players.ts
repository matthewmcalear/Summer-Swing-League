export interface WestmountPlayer {
  name: string;
  age?: number;
  role: 'skater' | 'goalie';
  returning: boolean;
  assumed?: boolean; // Player from last year not on this year's incoming list
  traded?: boolean; // Traded after draft (reunion follows season team, not draft team)
  ly_name?: string;
  ly_pos?: string;
  ly_team?: string; // Season team (post-trade)
  ly_draft_team?: string; // Original draft team (if traded)
  ly_adp?: string; // Last year's draft round (e.g., "R4", "R14")
  gp?: number;
  g?: number;
  a?: number;
  pts?: number;
  ppg?: number;
  pim?: number;
}

export const westmountPlayers: WestmountPlayer[] = [
  // Peter McAlear - explicitly added (last year Yeti F)
  { name: "McAlear, Peter", role: "skater", returning: true, ly_name: "Peter McAlear", ly_pos: "F", ly_team: "Yeti", gp: 25, g: 11, a: 13, pts: 24, ppg: 0.96, pim: 4 },
  
  // Steven McAlear - captain (last year Yeti F)
  { name: "McAlear, Steven", age: 30, role: "skater", returning: true, ly_name: "Steve McAlear", ly_pos: "F", ly_team: "Yeti", gp: 31, g: 13, a: 15, pts: 28, ppg: 0.9, pim: 14 },
  
  // Other McAlears (Yeti)
  { name: "McAlear, Thomas", age: 31, role: "skater", returning: true, ly_name: "Thomas McAlear", ly_pos: "F", ly_team: "Yeti", gp: 32, g: 15, a: 21, pts: 36, ppg: 1.12, pim: 20 },
  { name: "McAlear, Daniel", age: 33, role: "skater", returning: true, ly_name: "Daniel McAlear", ly_pos: "F", ly_team: "Yeti", gp: 23, g: 11, a: 12, pts: 23, ppg: 1.0, pim: 0 },
  { name: "McAlear, Matthew", age: 34, role: "skater", returning: true, ly_name: "Matthew McAlear", ly_pos: "", ly_team: "Yeti", gp: 23, g: 6, a: 9, pts: 15, ppg: 0.65, pim: 2 },
  
  // Rest of CSV data
  { name: "Angelini, Christopher", age: 36, role: "skater", returning: true, ly_name: "Chris Angelini", ly_pos: "F", ly_team: "Hawks", gp: 31, g: 21, a: 22, pts: 43, ppg: 1.39, pim: 18 },
  { name: "Angelini, Michael", age: 39, role: "skater", returning: true, ly_name: "Mike Angelini", ly_pos: "D", ly_team: "Hawks", gp: 32, g: 6, a: 13, pts: 19, ppg: 0.59, pim: 40 },
  { name: "Avraam, Sean", age: 45, role: "skater", returning: true, ly_name: "Sean Avraam", ly_pos: "F", ly_team: "Hawks", gp: 25, g: 14, a: 10, pts: 24, ppg: 0.96, pim: 22 },
  { name: "Balazinski, Alexander", age: 41, role: "skater", returning: true, ly_name: "Alex Balazinski", ly_pos: "F", ly_team: "Hawks", gp: 35, g: 12, a: 10, pts: 22, ppg: 0.63, pim: 19 },
  { name: "Bernier, Christophe", age: 30, role: "skater", returning: true, ly_name: "Christophe Bernier", ly_pos: "F", ly_team: "Devils", gp: 23, g: 8, a: 12, pts: 20, ppg: 0.87, pim: 6 },
  { name: "Chazonoff, Noah", age: 26, role: "skater", returning: false },
  { name: "Chetrit, Daniel", age: 24, role: "skater", returning: false },
  { name: "Ciampini, Adam", age: 42, role: "skater", returning: true, ly_name: "Adam Ciampini", ly_pos: "F", ly_team: "Hawks", gp: 31, g: 10, a: 14, pts: 24, ppg: 0.77, pim: 16 },
  { name: "Clarke, Lucas", age: 26, role: "skater", returning: true, ly_name: "Lucas Clarke", ly_pos: "F", ly_team: "Flyers", gp: 27, g: 20, a: 26, pts: 46, ppg: 1.7, pim: 22 },
  { name: "Clarke, Noah", age: 22, role: "skater", returning: true, ly_name: "Noah Clarke", ly_pos: "D", ly_team: "Kings", gp: 20, g: 5, a: 9, pts: 14, ppg: 0.7, pim: 12 },
  { name: "Cottingham, David", age: 30, role: "skater", returning: true, ly_name: "David Cottingham", ly_pos: "", ly_team: "Kings", gp: 23, g: 19, a: 19, pts: 38, ppg: 1.65, pim: 6 },
  { name: "Culver, Hugo", age: 21, role: "skater", returning: false },
  { name: "Delisle, Vincent", age: 35, role: "skater", returning: true, ly_name: "Vincent Delisle", ly_pos: "D", ly_team: "Hawks", gp: 24, g: 2, a: 9, pts: 11, ppg: 0.46, pim: 28 },
  { name: "D'Ermo, Kallio", age: 24, role: "skater", returning: true, ly_name: "Kallio D'Ermo", ly_pos: "D", ly_team: "Flyers", gp: 31, g: 4, a: 7, pts: 11, ppg: 0.35, pim: 24 },
  { name: "Descotes, William", age: 41, role: "skater", returning: true, ly_name: "William Descotes", ly_pos: "", ly_team: "Hawks", gp: 33, g: 6, a: 16, pts: 22, ppg: 0.67, pim: 18 },
  { name: "Dimentberg, Evan", age: 26, role: "skater", returning: false },
  { name: "Fersten, Mitchell", age: 55, role: "skater", returning: true, ly_name: "Mitchell Fersten", ly_pos: "F", ly_team: "Flyers", gp: 19, g: 2, a: 5, pts: 7, ppg: 0.37, pim: 20 },
  { name: "Fox, Lucas", age: 31, role: "skater", returning: true, ly_name: "Lucas Fox", ly_pos: "F", ly_team: "Flyers", gp: 19, g: 6, a: 7, pts: 13, ppg: 0.68, pim: 10 },
  { name: "Gaiotti, Daniele", age: 37, role: "skater", returning: true, ly_name: "Daniele Gaiotti", ly_pos: "F", ly_team: "Yeti", gp: 31, g: 5, a: 18, pts: 23, ppg: 0.74, pim: 14 },
  { name: "Galeone, Alessandro", age: 35, role: "skater", returning: true, ly_name: "Alessandro Galeone", ly_pos: "F", ly_team: "Devils", gp: 35, g: 8, a: 18, pts: 26, ppg: 0.74, pim: 28 },
  { name: "Gilman, Dustin", age: 40, role: "skater", returning: true, ly_name: "Dustin Gilman", ly_pos: "F", ly_team: "Hawks", gp: 31, g: 1, a: 12, pts: 13, ppg: 0.42, pim: 14 },
  { name: "Goodman, Justin", age: 25, role: "skater", returning: true, ly_name: "Justin Goodman", ly_pos: "", ly_team: "Flyers", gp: 25, g: 10, a: 15, pts: 25, ppg: 1.0, pim: 4 },
  { name: "Horner-Borsu, Konrad", age: 23, role: "skater", returning: true, ly_name: "Konrad Horner-Borsu", ly_pos: "F", ly_team: "Hawks", gp: 30, g: 24, a: 20, pts: 44, ppg: 1.47, pim: 12 },
  { name: "Kaplan, Jeremy", age: 34, role: "skater", returning: false },
  { name: "Kelly-Menard, Keane", age: 25, role: "skater", returning: true, ly_name: "Keane Kelly-Menard", ly_pos: "F", ly_team: "Devils", gp: 34, g: 39, a: 48, pts: 87, ppg: 2.56, pim: 14 },
  { name: "Larose, Michael", age: 28, role: "skater", returning: true, ly_name: "Michaël Larose", ly_pos: "F", ly_team: "Devils", gp: 32, g: 57, a: 47, pts: 104, ppg: 3.25, pim: 10 },
  { name: "Madar, Matthew", age: 25, role: "skater", returning: true, ly_name: "Matthew Madar", ly_pos: "F", ly_team: "Flyers", gp: 13, g: 1, a: 3, pts: 4, ppg: 0.31, pim: 0 },
  { name: "Martin, Philippe", age: 36, role: "skater", returning: true, ly_name: "Philippe Martin", ly_pos: "D", ly_team: "Devils", gp: 27, g: 0, a: 21, pts: 21, ppg: 0.78, pim: 16 },
  { name: "Mashaal, Alexander", age: 33, role: "skater", returning: true, ly_name: "Alex Mashaal", ly_pos: "F", ly_team: "Kings", gp: 33, g: 14, a: 16, pts: 30, ppg: 0.91, pim: 18 },
  { name: "Meltzer, Ryan", age: 30, role: "skater", returning: true, ly_name: "Ryan Meltzer", ly_pos: "", ly_team: "Hawks", gp: 25, g: 10, a: 12, pts: 22, ppg: 0.88, pim: 6 },
  { name: "MORGANTI, MARCO", age: 40, role: "skater", returning: true, ly_name: "Marco Morganti", ly_pos: "", ly_team: "Hawks", gp: 27, g: 4, a: 13, pts: 17, ppg: 0.63, pim: 12 },
  { name: "Murciano, Emile", age: 35, role: "skater", returning: true, ly_name: "Emile Murciano", ly_pos: "D", ly_team: "Devils", gp: 34, g: 2, a: 17, pts: 19, ppg: 0.56, pim: 10 },
  { name: "Neeposh-Iserhoff, Shawn Trevor", age: 41, role: "skater", returning: true, ly_name: "Shawn Trevor Neeposh-Iserhoff", ly_pos: "F", ly_team: "Devils", gp: 24, g: 10, a: 26, pts: 36, ppg: 1.5, pim: 12 },
  { name: "Ong Tone, Christopher", age: 41, role: "skater", returning: true, ly_name: "Chris Ong Tone", ly_pos: "F", ly_team: "Yeti", gp: 27, g: 21, a: 31, pts: 52, ppg: 1.93, pim: 26 },
  { name: "Orsini, Mark", age: 48, role: "skater", returning: true, ly_name: "Mark Orsini", ly_pos: "D", ly_team: "Hawks", gp: 31, g: 2, a: 8, pts: 10, ppg: 0.32, pim: 10 },
  { name: "Papich, Nikola", age: 31, role: "skater", returning: true, ly_name: "Nikki Papich", ly_pos: "", ly_team: "Kings", gp: 23, g: 11, a: 10, pts: 21, ppg: 0.91, pim: 6 },
  { name: "Petersen, David", age: 42, role: "skater", returning: true, ly_name: "David Peterson", ly_pos: "", ly_team: "Flyers", gp: 14, g: 2, a: 4, pts: 6, ppg: 0.43, pim: 6 },
  { name: "Pilon, Jean-François", age: 41, role: "skater", returning: false },
  { name: "Romary, Thomas", age: 24, role: "skater", returning: true, ly_name: "Thomas Romary", ly_pos: "D", ly_team: "Yeti", gp: 29, g: 14, a: 18, pts: 32, ppg: 1.1, pim: 18 },
  { name: "Sala, Jacob (Yuri)", age: 18, role: "skater", returning: false },
  { name: "Salvo, Anthony", age: 33, role: "skater", returning: true, ly_name: "Anthony Salvo", ly_pos: "F", ly_team: "Kings", gp: 25, g: 10, a: 16, pts: 26, ppg: 1.04, pim: 0 },
  { name: "Sawa, Jacob", age: 41, role: "skater", returning: true, ly_name: "Jacob Sawa", ly_pos: "F", ly_team: "Kings", gp: 25, g: 5, a: 16, pts: 21, ppg: 0.84, pim: 2 },
  { name: "Semionov, Ilya", age: 23, role: "skater", returning: true, ly_name: "Ilya Semionov", ly_pos: "F", ly_team: "Yeti", gp: 26, g: 2, a: 10, pts: 12, ppg: 0.46, pim: 6 },
  { name: "Semionov, Leo", age: 18, role: "skater", returning: false },
  { name: "Semionov, Nathan", age: 20, role: "skater", returning: false },
  { name: "Shved, Max", age: 35, role: "skater", returning: true, ly_name: "Max Shved", ly_pos: "", ly_team: "Yeti", gp: 21, g: 7, a: 7, pts: 14, ppg: 0.67, pim: 10 },
  { name: "Smith, Michael", age: 33, role: "skater", returning: true, ly_name: "Michael Smith", ly_pos: "F", ly_team: "Kings", gp: 28, g: 22, a: 27, pts: 49, ppg: 1.75, pim: 4 },
  { name: "Stenason, David I.", age: 34, role: "skater", returning: true, ly_name: "David Stenason", ly_pos: "", ly_team: "Kings", gp: 34, g: 7, a: 12, pts: 19, ppg: 0.56, pim: 24 },
  { name: "Tichoux, Xavier", age: 34, role: "skater", returning: true, ly_name: "Xavier Tichoux", ly_pos: "D", ly_team: "Yeti", gp: 34, g: 3, a: 14, pts: 17, ppg: 0.5, pim: 18 },
  { name: "Timmins, Brendan", age: 35, role: "skater", returning: true, ly_name: "Brendan Timmins", ly_pos: "D", ly_team: "Kings", gp: 27, g: 3, a: 6, pts: 9, ppg: 0.33, pim: 8 },
  { name: "Timmins, Nicholas", age: 37, role: "skater", returning: true, ly_name: "Nick Timmins", ly_pos: "F", ly_team: "Devils", gp: 33, g: 12, a: 24, pts: 36, ppg: 1.09, pim: 28 },
  { name: "Toledano, David", age: 45, role: "skater", returning: true, ly_name: "David Toledano", ly_pos: "", ly_team: "Yeti", gp: 30, g: 15, a: 26, pts: 41, ppg: 1.37, pim: 6 },
  { name: "Uhthoff, Nicholas", age: 30, role: "skater", returning: true, ly_name: "Nicholas Uhthoff", ly_pos: "", ly_team: "Kings", gp: 24, g: 4, a: 11, pts: 15, ppg: 0.62, pim: 8 },
  { name: "Viens, Luca", age: 24, role: "skater", returning: true, ly_name: "Luca Viens", ly_pos: "F", ly_team: "Devils", gp: 32, g: 24, a: 17, pts: 41, ppg: 1.28, pim: 12 },
  { name: "Yatrou, Evan", age: 25, role: "skater", returning: false },
  { name: "Young, Cooper", age: 26, role: "skater", returning: true, ly_name: "Cooper Young", ly_pos: "D", ly_team: "Kings", gp: 22, g: 1, a: 6, pts: 7, ppg: 0.32, pim: 10 },
  
  // Goalies (no stats) - Martin R4, Yarrow R14 by Yeti, Lach R7 by Kings
  // POST-DRAFT TRADE: Kings traded Lach to Yeti for Yarrow (Lach was Yeti's season/playoff goalie)
  { name: "Yarrow, Evan", age: 37, role: "goalie", returning: false, traded: true, ly_adp: "R14", ly_draft_team: "Yeti", ly_team: "Kings" },
  { name: "Lach, Jared", age: 22, role: "goalie", returning: false, traded: true, ly_adp: "R7", ly_draft_team: "Kings", ly_team: "Yeti" },
  { name: "Gironne, Michel", age: 49, role: "goalie", returning: false },
  { name: "Martin, Euan", age: 21, role: "goalie", returning: false, ly_adp: "R4" },
  
  // Assumed players (last year only, not on this year's incoming list)
  { name: "Masnaghetti, Daniel", role: "skater", returning: true, assumed: true, ly_name: "Daniel Masnaghetti", ly_pos: "", ly_team: "Kings", gp: 35, g: 18, a: 24, pts: 42, ppg: 1.2, pim: 0 },
  { name: "Pinchuk, Brandon", role: "skater", returning: true, assumed: true, ly_name: "Brandon Pinchuk", ly_pos: "D", ly_team: "Flyers", gp: 26, g: 12, a: 21, pts: 33, ppg: 1.27, pim: 0 },
  { name: "Orsini, James", role: "skater", returning: true, assumed: true, ly_name: "James Orsini", ly_pos: "", ly_team: "Hawks", gp: 24, g: 23, a: 9, pts: 32, ppg: 1.33, pim: 0 },
  { name: "Schmidt, Simon", role: "skater", returning: true, assumed: true, ly_name: "Simon Schmidt", ly_pos: "D", ly_team: "Devils", gp: 28, g: 5, a: 24, pts: 29, ppg: 1.04, pim: 0 },
  { name: "Palamodov, Anton", role: "skater", returning: true, assumed: true, ly_name: "Anton Palamodov", ly_pos: "", ly_team: "Kings", gp: 25, g: 10, a: 15, pts: 25, ppg: 1.0, pim: 0 },
  { name: "Mammone, Simon", role: "skater", returning: true, assumed: true, ly_name: "Simon Mammone", ly_pos: "F", ly_team: "Devils", gp: 28, g: 7, a: 18, pts: 25, ppg: 0.89, pim: 0 },
  { name: "Cohen, Sam", role: "skater", returning: true, assumed: true, ly_name: "Sam Cohen", ly_pos: "F", ly_team: "Devils", gp: 26, g: 6, a: 16, pts: 22, ppg: 0.85, pim: 0 },
  { name: "Arsenault, Tyler", role: "skater", returning: true, assumed: true, ly_name: "Tyler Arsenault", ly_pos: "F", ly_team: "Flyers", gp: 9, g: 8, a: 8, pts: 16, ppg: 1.78, pim: 0 },
  { name: "Eiley, Matthew", role: "skater", returning: true, assumed: true, ly_name: "Matthew Eiley", ly_pos: "", ly_team: "Flyers", gp: 17, g: 12, a: 3, pts: 15, ppg: 0.88, pim: 0 },
  { name: "Roskies, Liam", role: "skater", returning: true, assumed: true, ly_name: "Liam Roskies", ly_pos: "", ly_team: "Flyers", gp: 25, g: 5, a: 10, pts: 15, ppg: 0.6, pim: 0 },
  { name: "Kertzer, Richard", role: "skater", returning: true, assumed: true, ly_name: "Richard Kertzer", ly_pos: "D", ly_team: "Devils", gp: 9, g: 1, a: 7, pts: 8, ppg: 0.89, pim: 0 },
  { name: "Price, Tom", role: "skater", returning: true, assumed: true, ly_name: "Tom Price", ly_pos: "D", ly_team: "Kings", gp: 8, g: 3, a: 2, pts: 5, ppg: 0.62, pim: 0 },
  { name: "Friedman, David", role: "skater", returning: true, assumed: true, ly_name: "David Friedman", ly_pos: "F", ly_team: "Yeti", gp: 10, g: 3, a: 2, pts: 5, ppg: 0.5, pim: 0 },
  { name: "Cohen, Stephane", role: "skater", returning: true, assumed: true, ly_name: "Stephane Cohen", ly_pos: "F", ly_team: "Flyers", gp: 25, g: 2, a: 3, pts: 5, ppg: 0.2, pim: 0 },
  { name: "Fox, Dan \"Fire\"", role: "skater", returning: true, assumed: true, ly_name: "Dan \"Fire\" Fox", ly_pos: "F", ly_team: "Flyers", gp: 27, g: 1, a: 4, pts: 5, ppg: 0.19, pim: 0 },
  { name: "Saleh, Fred", role: "skater", returning: true, assumed: true, ly_name: "Fred Saleh", ly_pos: "D", ly_team: "Flyers", gp: 5, g: 1, a: 1, pts: 2, ppg: 0.4, pim: 0 },
  { name: "Robb, Michael", role: "skater", returning: true, assumed: true, ly_name: "Michael Robb", ly_pos: "", ly_team: "Flyers", gp: 6, g: 0, a: 1, pts: 1, ppg: 0.17, pim: 0 },
  
  // Additional assumed players (3 more)
  { name: "Walter, Aidan", role: "goalie", returning: false, assumed: true, ly_adp: "R6", ly_team: "Flyers" },
  { name: "Hodge, Dan", role: "skater", returning: true, assumed: true, ly_name: "Dan Hodge", ly_pos: "", ly_team: "Kings", ly_adp: "R8", gp: 0, g: 0, a: 0, pts: 0, ppg: 0, pim: 0 },
  { name: "Charbonneau, Damien", role: "skater", returning: true, assumed: true, ly_name: "Damien Charbonneau", ly_pos: "", ly_team: "Flyers", ly_adp: "R13", gp: 0, g: 0, a: 0, pts: 0, ppg: 0, pim: 0 },
];
