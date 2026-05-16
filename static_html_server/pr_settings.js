function switch_screen(next_screen){
    const game_screens = document.querySelectorAll('.pr');
    
    game_screens.forEach(function(pr){
        pr.style.display = 'none';
    });

    const display_screen = document.getElementById(next_screen);
    if (display_screen){
        display_screen.style.display = 'block';
        console.log('switch successfull');
    }

    let nb_potin = document.getElementById("nb_potin").value
    let prep_time_game = document.getElementById("prep_time").value
    let round_time = document.getElementById("round_time").value

    

    
}

