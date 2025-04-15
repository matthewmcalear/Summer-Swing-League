<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$currentPage = basename($_SERVER['PHP_SELF']);
?>
<nav class="navbar navbar-expand-lg navbar-dark mb-4">
    <div class="container">
        <a class="navbar-brand" href="index.php">SSL Golf</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav">
                <li class="nav-item">
                    <a class="nav-link <?php echo $currentPage === 'index.php' ? 'active' : ''; ?>" href="index.php">
                        <i class="fas fa-home"></i> Home
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#about">
                        <i class="fas fa-info-circle"></i> About SSL
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#rules">
                        <i class="fas fa-book"></i> Rules
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#prizes">
                        <i class="fas fa-trophy"></i> Prizes
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#contact">
                        <i class="fas fa-envelope"></i> Contact
                    </a>
                </li>
            </ul>
        </div>
    </div>
</nav> 